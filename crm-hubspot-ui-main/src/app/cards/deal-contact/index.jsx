import React, { useEffect, useState, useMemo } from "react";
import {
  hubspot,
  Flex,
  Box,
} from "@hubspot/ui-extensions";
import PanelUI from "./PanelUI";
import AssociationTable from "./AssociationTable";
import config from "../config.json";

hubspot.extend(({ context, actions }) => <DealContact context={context} actions={actions} />);

const DealContact = ({ context, actions }) => {

  const HUBSPOT_TOKEN = config.HUBSPOT_TOKEN;
  const dealId = context.crm.objectId;

  const [associatedCompanies, setAssociatedCompanies] = useState([]);
  const [primaryContactId, setPrimaryContactId] = useState(null);
  const [needToRefresh, setNeedToRefresh] = useState(false);

  const associatedContactsMemo = useMemo(
    () => (primaryContactId ? [primaryContactId] : []),
    [primaryContactId]
  );

  const fetchAssociatedCompany = async () => {
    try {
      const url = `https://api.hubapi.com/crm/v4/objects/deals/${dealId}/associations/companies`;
      const res = await hubspot.fetch(url, {
        headers: {
          Authorization: `Bearer ${HUBSPOT_TOKEN}`,
        },
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch associated companies. HTTP ${res.status}`);
      }
      const data = await res.json();
      const associatedCompaniesId = data?.results?.map((item) => item.toObjectId) || [];
      setAssociatedCompanies(associatedCompaniesId);
    } catch (error) {
      console.log("error", error);
    }
  };


  const fetchPrimaryContact = async () => {
    try {
      const url = `https://api.hubapi.com/crm/v3/objects/deals/${dealId}?properties=primary_contact_id`;
      const res = await hubspot.fetch(url, {
        headers: {
          Authorization: `Bearer ${HUBSPOT_TOKEN}`,
        },
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch deal primary contact. HTTP ${res.status}`);
      }
      const data = await res.json();
      const contactId = data?.properties?.primary_contact_id;
      setPrimaryContactId(contactId || null);
    } catch (error) {
      console.log("error", error);
    }
  };

  const fetchAssoObjects = async () => {
    await Promise.all([fetchAssociatedCompany(), fetchPrimaryContact()]);
  };

  useEffect(() => {
    fetchAssoObjects();
  }, [dealId]);

  useEffect(() => {
    if (needToRefresh) {
      fetchAssoObjects().finally(() => setNeedToRefresh(false));
    }
  }, [needToRefresh]);


  return <>
    <Flex direction="column" gap="xs">
      {primaryContactId && (
        <Box>
          <AssociationTable associatedContacts={associatedContactsMemo} context={context} />
        </Box>
      )}
      <Flex justify="center">
        <Box>
          <PanelUI context={context} actions={actions} associatedCompanies={associatedCompanies} associatedContacts={associatedContactsMemo} setNeedToRefresh={setNeedToRefresh} setPrimaryContactId={setPrimaryContactId} />
        </Box>
      </Flex>
    </Flex>
  </>;
};

export default DealContact;
