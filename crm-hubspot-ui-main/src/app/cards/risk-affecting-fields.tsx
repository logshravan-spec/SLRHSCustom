import { useEffect, useState } from "react";
import {
  hubspot,
  Box,
  Flex,
  Text,
  LoadingSpinner,
} from "@hubspot/ui-extensions";
import config from "./config.json";

const HUBSPOT_TOKEN = config.HUBSPOT_TOKEN;

const FIELDS: { label: string; property: string }[] = [
  { label: "Proposal Manager", property: config.PROPOSAL_MANAGER_PROPERTY },
  { label: "Proposal Director", property: config.PROPOSAL_DIRECTOR_PROPERTY },
  { label: "Project Location Country", property: config.PROJECT_LOCATION_COUNTRY_PROPERTY },
  { label: "Reputational Risk", property: config.REPUTATIONAL_RISK_PROPERTY },
];

const PROPERTY_NAMES = FIELDS.map((f) => f.property).join(",");

const OWNER_PROPERTIES = new Set([
  config.PROPOSAL_MANAGER_PROPERTY,
  config.PROPOSAL_DIRECTOR_PROPERTY,
]);

const resolveOwnerName = async (ownerId: string): Promise<string> => {
  const res = await hubspot.fetch(
    `https://api.hubapi.com/crm/v3/owners/${ownerId}?idProperty=id`,
    { headers: { Authorization: `Bearer ${HUBSPOT_TOKEN}` } }
  );
  if (!res.ok) return ownerId;
  const data = await res.json();
  return (
    [data?.firstName, data?.lastName].filter(Boolean).join(" ").trim() ||
    data?.email ||
    ownerId
  );
};

const resolveCountryName = (code: string): string => {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
};

const RiskAffectingFields = ({ context }: { context: any }) => {
  const dealId = context?.crm?.objectId;
  const [loading, setLoading] = useState(true);
  const [displayValues, setDisplayValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!dealId) return;
    const load = async () => {
      try {
        const res = await hubspot.fetch(
          `https://api.hubapi.com/crm/v3/objects/deals/${dealId}?properties=${PROPERTY_NAMES}`,
          { headers: { Authorization: `Bearer ${HUBSPOT_TOKEN}` } }
        );
        const data = await res.json();
        const props: Record<string, string> = data?.properties ?? {};
        const resolved: Record<string, string> = { ...props };

        await Promise.all(
          FIELDS.map(async ({ property }) => {
            const raw = props[property];
            if (!raw) return;
            if (OWNER_PROPERTIES.has(property) && /^\d+$/.test(raw)) {
              resolved[property] = await resolveOwnerName(raw);
            } else if (property === config.PROJECT_LOCATION_COUNTRY_PROPERTY) {
              resolved[property] = resolveCountryName(raw);
            }
          })
        );

        setDisplayValues(resolved);
      } catch {
        // fields will render as "–"
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [dealId]);

  if (loading) {
    return (
      <Flex justify="center" align="center">
        <LoadingSpinner label="Loading" />
      </Flex>
    );
  }

  return (
    <Flex direction="row" gap="xl">
      {FIELDS.map(({ label, property }) => (
        <Box key={property} flex={1}>
          <Flex direction="column" gap="xs">
            <Text variant="microcopy">{label}</Text>
            <Text>{displayValues[property] || "–"}</Text>
          </Flex>
        </Box>
      ))}
    </Flex>
  );
};

hubspot.extend(({ context }: { context: any }) => (
  <RiskAffectingFields context={context} />
));
