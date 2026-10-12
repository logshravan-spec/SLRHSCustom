import React from "react";
import { hubspot } from "@hubspot/ui-extensions";
import {
  Flex,
  Text,
  Table,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
  Link,
  Divider,
} from "@hubspot/ui-extensions";
import { useAssociations } from "@hubspot/ui-extensions/crm";

const DEAL_OBJECT_TYPE_ID = "0-3";

const ContactDealsTab = ({ context }: { context: any }) => {
  const portalId = context?.portalId ?? context?.portal_id;

  const { results, isLoading } = useAssociations({
    toObjectType: DEAL_OBJECT_TYPE_ID,
    properties: ["dealname", "amount", "dealstage", "closedate"],
  });

  if (isLoading) return <Text>Loading deals…</Text>;
  if (!results?.length) return <Text>No deals associated.</Text>;

  return (
    <Flex direction="column" gap="md" style={{ padding: "4px 0" }}>
      <Text format={{ fontWeight: "demibold" }}>Deals (view only)</Text>
      <Divider />

      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Deal</TableCell>
            <TableCell align="end">Amount</TableCell>
            <TableCell>Stage</TableCell>
            <TableCell>Close date</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {results.map((r: any) => {
            const id = r.toObjectId;
            const p = r.properties ?? {};
            const url = `https://app.hubspot.com/contacts/${portalId}/record/0-3/${id}`;

            return (
              <TableRow key={id}>
                <TableCell style={{ maxWidth: 260 }}>
                  <Link href={url} openInNewTab>
                    {p.dealname || `Deal #${id}`}
                  </Link>
                </TableCell>

                <TableCell align="end">
                  {p.amount ? Number(p.amount).toLocaleString() : "—"}
                </TableCell>

                <TableCell>{p.dealstage ?? "—"}</TableCell>
                <TableCell>{p.closedate ?? "—"}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Flex>
  );
};

hubspot.extend(({ context }) => <ContactDealsTab context={context} />);
