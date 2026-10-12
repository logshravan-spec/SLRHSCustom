import {
    Box,
    Flex,
    hubspot,
    Link,
    LoadingSpinner,
    Table,
    TableBody,
    TableCell,
    TableRow,
    Text,
    Button,
} from "@hubspot/ui-extensions";
import { useEffect, useState, useMemo } from "react";
import config from "../config.json";

const PAGE_SIZE = 5;

const AssociationTable = ({ associatedContacts = [], context }) => {
    const [loading, setLoading] = useState(false);
    const [contactsDetails, setContactsDetails] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const MAX_VISIBLE_PAGES = 3;

    const HUBSPOT_TOKEN = config.HUBSPOT_TOKEN;

    const hubspotUrl = `https://app-${context?.portal?.dataHostingLocation}.hubspot.com/contacts/${context?.portal?.id}/record/0-1/`;

    const fetchContacts = async () => {
        if (!associatedContacts.length) return;

        setLoading(true);

        try {
            const body = {
                filterGroups: [
                    {
                        filters: [
                            {
                                propertyName: "hs_object_id",
                                operator: "IN",
                                values: associatedContacts.slice(0, 100),
                            },
                        ],
                    },
                ],
                properties: ["firstname", "lastname", "email", "hs_object_id"],
            };

            const res = await hubspot.fetch(
                "https://api.hubapi.com/crm/v3/objects/contacts/search",
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${HUBSPOT_TOKEN}`,
                    },
                    body,
                }
            );

            const data = await res.json();
            setContactsDetails(data?.results || []);
            setCurrentPage(1); // reset page on new data
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const renderPagination = () => {
        if (totalPages <= 1) return null;

        const pages = [];

        const start = Math.max(
            1,
            currentPage - Math.floor(MAX_VISIBLE_PAGES / 2)
        );
        const end = Math.min(
            totalPages,
            start + MAX_VISIBLE_PAGES - 1
        );

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
                    {`<`}
                </Button>

                {pages}

                <Button
                    size="small"
                    variant="secondary"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                >
                    {`>`}
                </Button>
            </Flex>
        );
    };

    useEffect(() => {
        if (associatedContacts?.length > 0) {
            fetchContacts();
        }
    }, [associatedContacts]);

    const totalPages = Math.ceil(contactsDetails.length / PAGE_SIZE);

    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE;
        return contactsDetails.slice(start, start + PAGE_SIZE);
    }, [contactsDetails, currentPage]);


    if (loading) return <LoadingSpinner />;

    return (
        <Box>
            <Table bordered>
                <TableBody>
                    {paginatedData.map((c) => {
                        const id = c.properties.hs_object_id;

                        return (
                            <TableRow key={id}>
                                <TableCell>
                                    <Flex direction="column" gap="xs">
                                        <Link href={{ url: hubspotUrl + c.id }}>
                                            <Text format={{ fontWeight: "bold" }}>
                                                {c.properties.firstname} {c.properties.lastname}
                                            </Text>
                                        </Link>
                                        <Text>{c.properties.email}</Text>
                                    </Flex>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>

            {renderPagination()}
        </Box>
    );
};

export default AssociationTable;