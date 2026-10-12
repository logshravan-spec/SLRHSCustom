Feature: CRM-676 Deal Field Editability by Stage + Risk Affecting Fields Card

  Background:
    Given I am logged into HubSpot as a user with at least Editor access
    And I am viewing a Deal record

  # ── Financial card: stage-based editability ──────────────────────────────

  Scenario: Financial fields are editable in the Identify stage (STAGE_1)
    Given the deal is in the "Identify" stage
    When I open the Financial Details card
    Then the Fee Basis selector is enabled
    And the Deal Currency selector is enabled
    And the Labour input is enabled
    And the Expenses input is enabled
    And the Third Party Fees input is enabled
    And the FGD % input is enabled

  Scenario: Financial fields are editable in the Quality stage (STAGE_2)
    Given the deal is in the "Quality" stage
    When I open the Financial Details card
    Then the Fee Basis selector is enabled
    And the Deal Currency selector is enabled
    And the Labour input is enabled
    And the Expenses input is enabled
    And the Third Party Fees input is enabled
    And the FGD % input is enabled

  Scenario: Financial fields are editable in Proposal In Progress when Sustain Status is unknown
    Given the deal is in the "Proposal In Progress" stage
    And the deal's "sustain_status" property is "unknown"
    When I open the Financial Details card
    Then the Fee Basis selector is enabled
    And the Deal Currency selector is enabled
    And the Labour input is enabled
    And the Expenses input is enabled
    And the Third Party Fees input is enabled
    And the FGD % input is enabled

  Scenario: Financial fields are locked in Proposal In Progress when Sustain Status is not unknown
    Given the deal is in the "Proposal In Progress" stage
    And the deal's "sustain_status" property is "approved"
    When I open the Financial Details card
    Then the Fee Basis selector is disabled
    And the Deal Currency selector is disabled
    And the Labour input is disabled
    And the Expenses input is disabled
    And the Third Party Fees input is disabled
    And the FGD % input is disabled

  Scenario: Financial fields are locked in Closed Won stage
    Given the deal is in the "Closed Won" stage
    When I open the Financial Details card
    Then all financial input fields are disabled

  Scenario: Financial fields are locked in Closed Lost stage
    Given the deal is in the "Closed Lost" stage
    When I open the Financial Details card
    Then all financial input fields are disabled

  # ── Risk affecting fields card ────────────────────────────────────────────

  Scenario: Risk Affecting Fields card shows all four fields as view-only
    Given the deal has values set for Proposal Manager, Proposal Director, Project Location Country, and Reputational Risk
    When I open the Risk Affecting Fields card
    Then I see the "Proposal Manager" label and its value
    And I see the "Proposal Director" label and its value
    And I see the "Project Location Country" label and its value
    And I see the "Reputational Risk" label and its value
    And none of the fields have editable inputs

  Scenario: Risk Affecting Fields card shows a placeholder for empty fields
    Given the deal has no value set for "Proposal Director"
    When I open the Risk Affecting Fields card
    Then the "Proposal Director" row displays "–"

  Scenario: Risk Affecting Fields card is visible regardless of deal stage
    Given the deal is in any stage
    When I open the Risk Affecting Fields card
    Then the card is visible and renders without error

  Scenario: Risk Affecting Fields card shows a loading spinner while fetching data
    Given the deal properties have not yet loaded
    When I open the Risk Affecting Fields card
    Then a loading spinner is displayed
    And once data is loaded the spinner is replaced by the field values
