import React, { useEffect, useState, useMemo } from "react";
import {
  hubspot,
  Flex,
  Text,
  LoadingSpinner,
  Box,
  Button,
  Link,
  Table,
  TableBody,
  TableCell,
  TableRow,
  TableHeader,
  TableHead,
} from "@hubspot/ui-extensions";
import config from "./config.json";

const PAGE_SIZE = 5;
const MAX_VISIBLE_PAGES = 3;

const DealCompaniesAssociation = ({ context }) => {
  const [loading, setLoading] = useState(true);
  const [associatedCompanies, setAssociatedCompanies] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);

  const HUBSPOT_TOKEN = config.HUBSPOT_TOKEN;
  const dealId = context.crm.objectId;
  const hubspotUrl = `https://app-${context?.portal?.dataHostingLocation}.hubspot.com/contacts/${context?.portal?.id}/record/0-2/`;

  useEffect(() => {
    const fetchAssociations = async () => {
      setLoading(true);
      try {
        // 1. Get associated company IDs for the deal
        const assocRes = await hubspot.fetch(
          `https://api.hubapi.com/crm/v4/objects/deals/${dealId}/associations/companies`,
          {
            headers: { Authorization: `Bearer ${HUBSPOT_TOKEN}` },
          }
        );
        const assocData = await assocRes.json();
        const companyIds = assocData.results?.map((r) => r.toObjectId) || [];

        if (companyIds.length === 0) {
          setAssociatedCompanies([]);
          setLoading(false);
          return;
        }

        // 2. Fetch company details for those IDs
        const searchRes = await hubspot.fetch(
          "https://api.hubapi.com/crm/v3/objects/companies/search",
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
                      values: companyIds.slice(0, 100),
                    },
                  ],
                },
              ],
              properties: ["name", "domain", "phone", "email"],
            },
          }
        );
        const searchData = await searchRes.json();
        setAssociatedCompanies(searchData.results || []);
      } catch (error) {
        console.error("Error fetching associated companies:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAssociations();
  }, [dealId]);

  const totalPages = Math.ceil(associatedCompanies.length / PAGE_SIZE);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return associatedCompanies.slice(start, start + PAGE_SIZE);
  }, [associatedCompanies, currentPage]);

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const start = Math.max(1, currentPage - Math.floor(MAX_VISIBLE_PAGES / 2));
    const end = Math.min(totalPages, start + MAX_VISIBLE_PAGES - 1);

    for (let i = start; i <= end; i++) {
      pages.push(
        <Button
          key={i}
          size="small"
          variant={i === currentPage ? "primary" : "secondary"}
          onClick={() => setCurrentPage(i)}
          style={{ minWidth: 34 }}
        >
          {i}
        </Button>
      );
    }

    return (
      <Flex align="center" justify="center" gap="xs" marginTop="md">
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
      <Flex justify="center" align="center" style={{ minHeight: 100 }}>
        <LoadingSpinner />
      </Flex>
    );
  }

  if (associatedCompanies.length === 0) {
    return <Text>No associated company found.</Text>;
  }

  return (
    <Flex direction="column" gap="md">
      <Table bordered>
        <TableHead>
          <TableRow>
            <TableHeader>Company Name</TableHeader>
            <TableHeader>Domain</TableHeader>
            <TableHeader>Phone</TableHeader>
            <TableHeader>Email</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {paginatedData.map((company) => {
            const { name, domain, phone, email, hs_object_id } = company.properties;
            return (
              <TableRow key={hs_object_id}>
                <TableCell>
                  <Link href={{ url: hubspotUrl + hs_object_id }}>
                    <Text format={{ fontWeight: "bold" }}>
                      {name || "(No name)"}
                    </Text>
                  </Link>
                </TableCell>
                <TableCell>
                  <Text>{domain || "-"}</Text>
                </TableCell>
                <TableCell>
                  <Text>{phone || "-"}</Text>
                </TableCell>
                <TableCell>
                  <Text>{email || "-"}</Text>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {renderPagination()}
    </Flex>
  );
};

hubspot.extend(({ context }) => <DealCompaniesAssociation context={context} />);
