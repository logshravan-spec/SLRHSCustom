import React from "react";
import { hubspot, Flex, Text, Box, Link } from "@hubspot/ui-extensions";

const SUSTAIN_URL = "https://sustain.slrconsulting.com";

const SustainLockNotice = () => (
  <Box
    style={{
      backgroundColor: "#FEF2F2",
      border: "1px solid #FECACA",
      borderRadius: 8,
      padding: "12px 16px",
    }}
  >
    <Flex direction="column" gap="sm">
      <Text format={{ fontWeight: "demibold" }}>
        🛑 Financial & Risk Fields are Locked
      </Text>
      <Text>
        Because a Sustain Status is active for this proposal, financial and
        risk-affecting details cannot be edited here. Please make all updates
        directly in{" "}
        <Link href={SUSTAIN_URL} openInNewTab>
          Sustain
        </Link>{" "}
        to ensure compliance with the risk review process.
      </Text>
    </Flex>
  </Box>
);

hubspot.extend(() => <SustainLockNotice />);
