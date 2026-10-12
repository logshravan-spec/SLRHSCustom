import React from "react";
import { hubspot } from "@hubspot/ui-extensions";
import { Flex, Text, Divider, Link, Alert } from "@hubspot/ui-extensions";

const SUSTAIN_URL = "https://sustain.slrconsulting.com";

const Step = ({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: React.ReactNode;
}) => (
  <Flex direction="column" gap="xs">
    <Text format={{ fontWeight: "demibold" }}>
      {number}. {title}
    </Text>
    <Text>{description}</Text>
  </Flex>
);

const DealRequiredStepsSimple = () => {
  return (
    <Flex
      direction="column"
      gap="md"
      style={{
        padding: "12px",
        backgroundColor: "#ddcb81ff", // soft yellow
        border: "1px solid #FDE68A",
        borderRadius: 8,
      }}
    >
    <Alert title="" variant="danger">
        Follow these guidelines when working this deal.
    </Alert>

      <Step
        number={1}
        title="Associate a contact"
        description={
          <>
            You must link at least one contact to this deal using the "Deal Contact association" section.
          </>
        }
      />

      <Step
        number={2}
        title="Moving to Proposal Stage?"
        description={
          <>
            Deals should not be moved to "Proposal" or later stages directly in HubSpot. Please navigate to  <Link href={SUSTAIN_URL} openInNewTab> Sustain</Link> to manage approvals; Your updates will sync back automatically.
          </>
        }
      />
    </Flex>
  );
};

hubspot.extend(() => <DealRequiredStepsSimple />);
