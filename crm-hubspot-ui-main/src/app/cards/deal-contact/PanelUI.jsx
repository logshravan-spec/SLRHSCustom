import {
    Button,
    Panel,
    PanelBody,
    PanelSection,
    PanelFooter,
    Text,
    Flex,
    SearchInput,
    hubspot,
    EmptyState,
    LoadingSpinner,
    Table,
    TableCell,
    TableBody,
    TableHeader,
    TableHead,
    TableRow,
    RadioButton,
} from '@hubspot/ui-extensions';
import React, { useEffect, useState, useCallback } from 'react';
import config from '../config.json';


async function hsFetch(url, options = {}) {
  // HubSpot extension runtime rejects extra headers on some CRM endpoints.
  // Keep request options as-is so only explicit headers (Authorization) are sent.
  return hubspot.fetch(url, options);
}



const useDebouncedValue = (value = "", delay = 500) => {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);

    return debounced;
};

const PAGE_SIZE = 10;
const MAX_VISIBLE_PAGES = 3;
const PRIMARY_CONTACT_PROPERTY = "primary_contact_id";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getHubSpotErrorMessage = async (response) => {
    try {
        const payload = await response.json();
        return payload?.message || payload?.errors?.[0]?.message || `HTTP ${response.status}`;
    } catch (_) {
        return `HTTP ${response.status}`;
    }
};

const PanelUI = ({ context, actions, associatedCompanies, associatedContacts = [], setNeedToRefresh, setPrimaryContactId }) => {
    const HUBSPOT_TOKEN = config.HUBSPOT_TOKEN;
    const dealId = context.crm.objectId;

    const [associatedContactIds, setAssociatedContactIds] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [selectedContactId, setSelectedContactId] = useState("");

    const [searchText, setSearchText] = useState('');
    const debouncedSearchText = useDebouncedValue(searchText);

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [page, setPage] = useState(1);
    const [pageCursors, setPageCursors] = useState({ 1: null });
    const [hasMore, setHasMore] = useState(false);
    const [maxVisiblePages, setMaxVisiblePages] = useState(MAX_VISIBLE_PAGES);

    const fetchAssociatedContacts = useCallback(async () => {
        const ids = new Set();

        for (const companyId of associatedCompanies || []) {
            let cursor;
            do {
                const url = new URL(
                    `https://api.hubapi.com/crm/v4/objects/companies/${companyId}/associations/contacts`
                );
                url.searchParams.set('limit', '500');
                if (cursor) url.searchParams.set('after', cursor);

                const res = await hubspot.fetch(url.toString(), {
                    headers: { Authorization: `Bearer ${HUBSPOT_TOKEN}` },
                });

                const data = await res.json();
                data.results?.forEach(r => ids.add(String(r.toObjectId)));
                cursor = data.paging?.next?.after;
            } while (cursor);
        }

        setAssociatedContactIds([...ids]);
    }, [associatedCompanies]);

    const fetchContacts = useCallback(
        async (pageNumber) => {
            if (!associatedContactIds.length) return;

            setLoading(true);

            try {
                const body = {
                    filterGroups: [{
                        filters: [{
                            propertyName: 'hs_object_id',
                            operator: 'IN',
                            values: associatedContactIds.slice(0, 100),
                        }],
                    }],
                    properties: ['firstname', 'lastname', 'email', 'hs_object_id'],
                    limit: PAGE_SIZE,
                    query: debouncedSearchText,
                    after: pageCursors[pageNumber] ?? null,
                };

                const res = await hubspot.fetch(
                    'https://api.hubapi.com/crm/v3/objects/contacts/search',
                    {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${HUBSPOT_TOKEN}` },
                        body,
                    }
                );

                const data = await res.json();

                const dynamicPageSize = Math.ceil((data?.total || 0) / PAGE_SIZE);
                setMaxVisiblePages(Math.min(MAX_VISIBLE_PAGES, Math.max(1, dynamicPageSize)));

                setContacts(data.results || []);
                setHasMore(Boolean(data.paging?.next?.after));

                // Save cursor for next page
                if (data.paging?.next?.after) {
                    setPageCursors(prev => ({
                        ...prev,
                        [pageNumber + 1]: data.paging.next.after,
                    }));
                }

                setPage(pageNumber);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        },
        [associatedContactIds, debouncedSearchText, pageCursors]
    );

    useEffect(() => {
        fetchAssociatedContacts();
    }, [fetchAssociatedContacts]);

    useEffect(() => {
        setPage(1);
        setPageCursors({ 1: null });
        if (!debouncedSearchText?.trim() || debouncedSearchText.length > 3) {
            fetchContacts(1);
        }
    }, [associatedContactIds, debouncedSearchText]);

    useEffect(() => {
        if (associatedContacts?.length > 0) {
            const contactId = associatedContacts[0]
            setSelectedContactId(contactId);
        }
    }, [associatedContacts]);

    const renderPagination = () => {
        const pages = [];

        const knownPages = Math.max(...Object.keys(pageCursors).map(Number));
        const totalVisiblePages =
            knownPages < maxVisiblePages && !hasMore
                ? knownPages
                : Math.max(maxVisiblePages, knownPages);

        const start = Math.max(1, page - 2);
        const end = Math.min(totalVisiblePages, start + maxVisiblePages - 1);

        for (let i = start; i <= end; i++) {
            const isClickable =
                i === 1 ||
                pageCursors[i] !== undefined ||
                (i === page + 1 && hasMore);

            pages.push(
                <Button
                    key={i}
                    size="small"
                    variant={i === page ? 'primary' : 'secondary'}
                    disabled={!isClickable}
                    onClick={() => isClickable && fetchContacts(i)}
                    style={{
                        minWidth: 34,
                        padding: '0 8px',
                    }}
                >
                    {i}
                </Button>
            );
        }

        return (
            <Flex
                align="center"
                justify="center"
                gap="xs"
            >
                <Button
                    size="small"
                    variant="secondary"
                    disabled={page === 1}
                    onClick={() => fetchContacts(page - 1)}
                >
                    ◀
                </Button>

                {pages}

                <Button
                    size="small"
                    variant="secondary"
                    disabled={!hasMore}
                    onClick={() => fetchContacts(page + 1)}
                >
                    ▶
                </Button>
            </Flex>
        );
    };

    const verifyPrimaryContactPersisted = useCallback(
        async (expectedValue) => {
            for (let attempt = 0; attempt < 5; attempt += 1) {
                const verifyRes = await hsFetch(
                    `https://api.hubapi.com/crm/v3/objects/deals/${dealId}?properties=${PRIMARY_CONTACT_PROPERTY}`,
                    {
                        headers: { Authorization: `Bearer ${HUBSPOT_TOKEN}` },
                    }
                );

                if (!verifyRes.ok) {
                    const message = await getHubSpotErrorMessage(verifyRes);
                    throw new Error(`Unable to verify primary contact update. ${message}`);
                }

                const verifyData = await verifyRes.json();
                const persisted = String(verifyData?.properties?.[PRIMARY_CONTACT_PROPERTY] || "");
                if (persisted === String(expectedValue || "")) {
                    return true;
                }

                await sleep(300);
            }

            return false;
        },
        [dealId, HUBSPOT_TOKEN]
    );


    const handleSubmit = async () => {
        if (saving) return;
        setSaving(true);
        const expectedValue = selectedContactId || "";

        const body = { inputs: [] };

        if (selectedContactId) {
            body.inputs.push({
                from: { id: dealId },
                to: { id: selectedContactId },
                types: [
                    {
                        associationCategory: 'HUBSPOT_DEFINED',
                        associationTypeId: 3,
                    },
                ],
            });
        }

        try {
            // We still create the association for HubSpot's native UI,
            // but we don't archive others anymore to avoid conflict with manual associations.
            if (selectedContactId) {
                const associationRes = await hsFetch(
                    'https://api.hubapi.com/crm/v4/associations/deals/contacts/batch/create',
                    {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${HUBSPOT_TOKEN}` },
                        body,
                    }
                );

                // The association may already exist; that should not block saving the primary property.
                if (!associationRes.ok && associationRes.status !== 409) {
                    const message = await getHubSpotErrorMessage(associationRes);
                    throw new Error(`Unable to associate selected contact. ${message}`);
                }
            }

            const updateRes = await hsFetch(`https://api.hubapi.com/crm/v3/objects/deals/${dealId}`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${HUBSPOT_TOKEN}` },
                body: {
                    properties: {
                        [PRIMARY_CONTACT_PROPERTY]: expectedValue,
                    },
                },
            });

            if (!updateRes.ok) {
                const message = await getHubSpotErrorMessage(updateRes);
                throw new Error(`Unable to update deal primary contact. ${message}`);
            }

            const persisted = await verifyPrimaryContactPersisted(expectedValue);
            if (!persisted) {
                throw new Error("Primary contact save did not persist on the deal record.");
            }

            actions.addAlert({
                title: "Primary contact updated successfully",
                message: ` `,
                type: "success"
            })
            setPrimaryContactId(expectedValue || null);
            actions.closeOverlay("primary-contact");
            setNeedToRefresh(true);
            await actions?.refreshObjectProperties()
        } catch (error) {
            actions.addAlert({
                title: "Update failed",
                message: error?.message || `Failed to update primary contact`,
                type: "error"
            })
        } finally {
            setSaving(false);
        }
    };

    return (
        <Button
              overlay={
                <Panel title="Set Primary Contact" id="primary-contact">
                  <PanelBody>
                    <PanelSection>
                      <Flex direction="column" gap="lg">
                        <SearchInput
                          value={searchText}
                          onChange={setSearchText}
                          placeholder="Search contacts…"
                        />
                        {loading ? (
                          <Flex justify="center" align="center" style={{ minHeight: 200 }}>
                            <LoadingSpinner />
                          </Flex>
                        ) : contacts.length ? (
                          <Flex direction="column" gap="md">
                            <Table bordered>
                              <TableHead>
                                <TableRow>
                                  <TableHeader>Name</TableHeader>
                                  <TableHeader width="min" />
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {contacts.map((c) => {
                                  const id = String(c.properties.hs_object_id);
                                  const first = c.properties.firstname || "";
                                  const last = c.properties.lastname || "";
                                  return (
                                    <TableRow key={id}>
                                      <TableCell>
                                        {`${first} ${last}`.trim() || "(No name)"}
                                      </TableCell>
                                      <TableCell align="center">
                                        <RadioButton
                                          checked={selectedContactId === id}
                                          onChange={() => setSelectedContactId(id)}
                                        />
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                            {renderPagination()}
                          </Flex>
                        ) : (
                          <EmptyState title="No contacts found" />
                        )}
                      </Flex>
                    </PanelSection>
                  </PanelBody>

                  <PanelFooter>
                    <Flex direction="column" gap="md">
                      <Text variant="micro">
                        {selectedContactId
                          ? "1 contact selected"
                          : "No contact selected"}
                      </Text>
                      <Flex justify="end" align="center" gap="sm">
                        <Button
                          variant="secondary"
                          onClick={() => actions.closeOverlay("primary-contact")}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="secondary"
                          disabled={!selectedContactId}
                          onClick={() => setSelectedContactId("")}
                        >
                          Clear
                        </Button>
                        <Button
                          variant="primary"
                          onClick={handleSubmit}
                          disabled={saving || (!selectedContactId && associatedContacts.length === 0)}
                        >
                          {saving ? "Saving…" : "Save"}
                        </Button>
                      </Flex>
                    </Flex>
                  </PanelFooter>
                </Panel>
              }
              variant="transparent"
            >
              Set Primary Contact
        </Button>
    );
};

export default PanelUI;
