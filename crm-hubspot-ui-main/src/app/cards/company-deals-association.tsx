import React, { useEffect, useState, useMemo } from "react";
import {
  hubspot,
  Flex,
  Text,
  Table,
  TableBody,
  TableCell,
  TableRow,
  TableHeader,
  TableHead,
  LoadingSpinner,
  Box,
  Button,
  Link,
} from "@hubspot/ui-extensions";
import { CrmActionButton } from "@hubspot/ui-extensions/crm";
import config from "./config.json";

const PAGE_SIZE = 5.0;
const MAX_VISIBLE_PAGES = 3;
const DEAL_OBJECT_TYPE_ID = "0-3";
const COMPANY_OBJECT_TYPE_ID = "0-2";

type DealRecord = {
  id?: string;
  properties: {
    dealname?: string;
    amount?: string;
    dealstage?: string;
    closedate?: string | number;
    hubspot_owner_id?: string;
    pipeline?: string;
    deal_currency?: string;
    hs_currency?: string;
    hs_object_id?: string;
  };
};

type StageLabelMap = Record<string, string>;
type PipelineLabelMap = Record<string, string>;
type OwnerLabelMap = Record<string, string>;

const CompanyDealsAssociation = ({ context, actions }) => {
  const [loading, setLoading] = useState(true);
  const [associatedDeals, setAssociatedDeals] = useState<DealRecord[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [stageLabels, setStageLabels] = useState<StageLabelMap>({});
  const [pipelineLabels, setPipelineLabels] = useState<PipelineLabelMap>({});
  const [ownerLabels, setOwnerLabels] = useState<OwnerLabelMap>({});

  const HUBSPOT_TOKEN = config.HUBSPOT_TOKEN;
  const companyId = context.crm.objectId;
  const hubspotUrl = `https://app-${context?.portal?.dataHostingLocation}.hubspot.com/contacts/${context?.portal?.id}/record/0-3/`;

  useEffect(() => {
    const fetchDealStages = async () => {
      try {
        const res = await hubspot.fetch(
          "https://api.hubapi.com/crm/v3/pipelines/deals",
          {
            headers: { Authorization: `Bearer ${HUBSPOT_TOKEN}` },
          }
        );
        const data = await res.json();
        const nextLabels: StageLabelMap = {};
        const nextPipelines: PipelineLabelMap = {};
        (data?.results || []).forEach((pipeline) => {
          if (pipeline?.id) {
            nextPipelines[pipeline.id] = pipeline.label || pipeline.id;
          }
          (pipeline?.stages || []).forEach((stage) => {
            if (stage?.id) {
              nextLabels[stage.id] = stage.label || stage.id;
            }
          });
        });
        setStageLabels(nextLabels);
        setPipelineLabels(nextPipelines);
      } catch (error) {
        console.error("Error fetching deal stages:", error);
      }
    };

    fetchDealStages();
  }, []);

  useEffect(() => {
    const fetchOwners = async () => {
      try {
        const res = await hubspot.fetch(
          "https://api.hubapi.com/crm/v3/owners?limit=500&archived=false",
          {
            headers: { Authorization: `Bearer ${HUBSPOT_TOKEN}` },
          }
        );
        const data = await res.json();
        const nextOwners: OwnerLabelMap = {};
        (data?.results || []).forEach((owner) => {
          const ownerName = [owner?.firstName, owner?.lastName]
            .filter(Boolean)
            .join(" ")
            .trim();
          nextOwners[String(owner?.id)] =
            ownerName || owner?.email || String(owner?.id || "");
        });
        setOwnerLabels(nextOwners);
      } catch (error) {
        console.error("Error fetching deal owners:", error);
      }
    };

    fetchOwners();
  }, []);

  useEffect(() => {
    const fetchAssociations = async () => {
      setLoading(true);
      try {
        // 1. Get associated deal IDs for the company
        const assocRes = await hubspot.fetch(
          `https://api.hubapi.com/crm/v4/objects/companies/${companyId}/associations/deals?limit=100`,
          {
            headers: { Authorization: `Bearer ${HUBSPOT_TOKEN}` },
          }
        );
        const assocData = await assocRes.json();
        const dealIds = assocData.results?.map((r) => r.toObjectId) || [];

        if (dealIds.length === 0) {
          setAssociatedDeals([]);
          setLoading(false);
          return;
        }

        // 2. Fetch deal details for those IDs
        const searchRes = await hubspot.fetch(
          "https://api.hubapi.com/crm/v3/objects/deals/search",
          {
            method: "POST",
            headers: { Authorization: `Bearer ${HUBSPOT_TOKEN}` },
            body: {
              filterGroups: [
                {
                  filters: [
                    {
                      propertyName: "hs_object_id",
                      operator: "IN",
                      values: dealIds.slice(0, 100),
                    },
                  ],
                },
              ],
              limit: 100,
              properties: [
                "dealname",
                "amount",
                "dealstage",
                "closedate",
                "hubspot_owner_id",
                "pipeline",
                "deal_currency",
                "hs_currency",
              ],
            },
          }
        );
        const searchData = await searchRes.json();
        setAssociatedDeals(searchData.results || []);
      } catch (error) {
        console.error("Error fetching associated deals:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAssociations();
  }, [companyId]);

  const formatAmount = (value?: string, currency?: string) => {
    if (value === null || value === undefined || value === "") return "-";
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return value;
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency || "USD",
      }).format(parsed);
    } catch (error) {
      return `$${parsed.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }
  };

  const formatCloseDate = (value?: string | number) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleActionError = (errors: string[] = []) => {
    // actions.addAlert({
    //   title: "Unable to open create deal",
    //   message: errors[0] || "Please check your permissions and try again.",
    //   type: "danger",
    // });
  };

  const totalPages = Math.ceil(associatedDeals.length / PAGE_SIZE);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return associatedDeals.slice(start, start + PAGE_SIZE);
  }, [associatedDeals, currentPage]);

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages: React.ReactNode[] = [];
    const start = Math.max(1, currentPage - Math.floor(MAX_VISIBLE_PAGES / 2));
    const end = Math.min(totalPages, start + MAX_VISIBLE_PAGES - 1);

    for (let i = start; i <= end; i++) {
      pages.push(
        <Button
          key={i}
          size="small"
          variant={i === currentPage ? "primary" : "secondary"}
          onClick={() => setCurrentPage(i)}
        >
          {i}
        </Button>
      );
    }

    return (
      <Flex align="center" justify="center" gap="xs">
        <Button
          size="small"
          variant="secondary"
          disabled={currentPage === 1}
          onClick={() => setCurrentPage((p) => p - 1)}
        >
          {"<"}
        </Button>
        {pages}
        <Button
          size="small"
          variant="secondary"
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage((p) => p + 1)}
        >
          {">"}
        </Button>
      </Flex>
    );
  };

  if (loading) {
    return (
      <Flex justify="center" align="center">
        <LoadingSpinner label="Loading deals" />
      </Flex>
    );
  }

  return (
    <Flex direction="column" gap="md">
      <Flex justify="end" align="center">
        <CrmActionButton
          size="small"
          variant="primary"
          actionType="OPEN_RECORD_ASSOCIATION_FORM"
          actionContext={{
            objectTypeId: DEAL_OBJECT_TYPE_ID,
            association: {
              objectTypeId: COMPANY_OBJECT_TYPE_ID,
              objectId: companyId,
            },
          }}
          onError={handleActionError}
        >
          Add Deal
        </CrmActionButton>
      </Flex>

      <Box>
        {associatedDeals.length === 0 ? (
          <Text>No associated deals found.</Text>
        ) : (
          <>
            <Table bordered>
              <TableHead>
                <TableRow>
                  <TableHeader>Deal Name</TableHeader>
                  <TableHeader>Amount</TableHeader>
                  <TableHeader>Owner</TableHeader>
                  <TableHeader>Stage</TableHeader>
                  <TableHeader>Close Date</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedData.map((deal) => {
                  const {
                    dealname,
                    amount,
                    dealstage,
                    closedate,
                    hubspot_owner_id,
                    pipeline,
                    deal_currency,
                    hs_currency,
                    hs_object_id,
                  } = deal.properties;
                  const stageLabel =
                    (dealstage && stageLabels[dealstage]) || dealstage || "-";
                  const pipelineLabel =
                    (pipeline && pipelineLabels[pipeline]) || pipeline || "";
                  const stageDisplay =
                    stageLabel !== "-" && pipelineLabel
                      ? `${stageLabel} (${pipelineLabel})`
                      : stageLabel;
                  const ownerLabel =
                    (hubspot_owner_id &&
                      ownerLabels[String(hubspot_owner_id)]) ||
                    "-";
                  const currencyCode = deal_currency || hs_currency;
                  return (
                    <TableRow key={hs_object_id}>
                      <TableCell>
                        <Link href={{ url: hubspotUrl + hs_object_id }}>
                          <Text format={{ fontWeight: "bold" }}>
                            {dealname || "(No name)"}
                          </Text>
                        </Link>
                      </TableCell>
                      <TableCell>{formatAmount(amount, currencyCode)}</TableCell>
                      <TableCell>{ownerLabel}</TableCell>
                      <TableCell>{stageDisplay}</TableCell>
                      <TableCell>{formatCloseDate(closedate)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {renderPagination()}
          </>
        )}
      </Box>
    </Flex>
  );
};

hubspot.extend(({ context, actions }) => (
  <CompanyDealsAssociation context={context} actions={actions} />
));
