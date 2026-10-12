import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  hubspot,
  Flex,
  Text,
  LoadingSpinner,
  NumberInput,
  Select,
  Box,
} from "@hubspot/ui-extensions";
import config from "./config.json";

const HUBSPOT_TOKEN = config.HUBSPOT_TOKEN_FINANCIAL;

// HubSpot configuration.
const USER_META_CUSTOM_OBJECT_TYPE_ID = config.USER_META_CUSTOM_OBJECT_TYPE_ID;
const CURRENCY_CUSTOM_OBJECT_TYPE_ID = config.CURRENCY_CUSTOM_OBJECT_TYPE_ID;
const DEFAULT_REGION_CODE = config.DEFAULT_REGION_CODE;

// Deal and custom object property names.
const PROPOSAL_MANAGER_PROPERTY = config.PROPOSAL_MANAGER_PROPERTY;
const USER_META_USER_PROPERTY = config.USER_META_USER_PROPERTY;
const REGION_CODE_PROPERTY = config.REGION_CODE_PROPERTY;
const FEE_BASIS_PROPERTY = "fee_basis";
const CHARGE_TYPE_PROPERTY = "charge_type";
const DEAL_STAGE_PROPERTY = "dealstage";
const DEAL_CURRENCY_PROPERTY = "deal_currency";
const LABOUR_PROPERTY = "labour";
const COMPANY_CODE_PROPERTY = config.COMPANY_CODE_PROPERTY;
const ALLOWED_CURRENCIES_PROPERTY = config.ALLOWED_CURRENCIES_PROPERTY;
const EXPENSES_PROPERTY_CANDIDATES = [
  "expenses",
  "estimated_expenses",
  "estimated_expense",
  "estimated_expense_amount",
  "deal_expenses",
];
const THIRD_PARTY_FEES_PROPERTY = "estimated_3rd_party_fees";
const FGD_PERCENT_PROPERTY = "fixed_general_disbursement_percentage";
const EDITABLE_DEAL_STAGES = new Set([
  config.STAGE_1,
  config.STAGE_2,
]);
const PROPOSAL_IN_PROGRESS_STAGE = config.STAGE_3;
const SUSTAIN_STATUS_PROPERTY = config.SUSTAIN_STATUS_PROPERTY;

const CLEAN_INPUT_STYLE = {
  padding: 0,
  background: "transparent",
  border: "none",
  boxShadow: "none",
};

const parseAllowedCurrencies = (value = "") =>
  Array.from(
    new Set(
      value
        .split(/[;,]/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );

const toTrimmedString = (value) =>
  value === null || value === undefined ? "" : String(value).trim();


async function hsFetch(url, options = {}) {
  return hubspot.fetch(url, options);
}

const getHubSpotErrorMessage = async (res) => {
  try {
    const data = await res.json();
    return data?.message || `HTTP ${res.status}`;
  } catch (error) {
    return `HTTP ${res.status}`;
  }
};

const FinancialDetailsCard = ({ context, actions }) => {
  const dealId = context?.crm?.objectId;
  const [loading, setLoading] = useState(true);
  const [, setSaving] = useState(false);
  const [properties, setProperties] = useState({});
  const [draftProperties, setDraftProperties] = useState({});
  const [hasLoaded, setHasLoaded] = useState(false);
  const [expensesPropertyName, setExpensesPropertyName] = useState(null);
  const [feeBasisOptions, setFeeBasisOptions] = useState([]);
  const [chargeTypeOptions, setChargeTypeOptions] = useState([]);
  const [allowedCurrencies, setAllowedCurrencies] = useState([]);
  const [selectedCurrency, setSelectedCurrency] = useState("");
  const [sustainStatus, setSustainStatus] = useState(null);
  const savingRef = useRef(false);
  const pendingSaveRef = useRef(false);
  const saveTimeoutRef = useRef(null);
  const isInitialLoadRef = useRef(true);

  const fetchPropertyOptions = async (propertyName) => {
    const res = await hsFetch(
      `https://api.hubapi.com/crm/v3/properties/deals/${propertyName}`,
      {
        headers: { Authorization: `Bearer ${HUBSPOT_TOKEN}` },
      }
    );

    if (!res.ok) {
      const message = await getHubSpotErrorMessage(res);
      throw new Error(message);
    }

    const data = await res.json();
    return (data?.options || []).map((option) => ({
      label: option.label,
      value: option.value,
    }));
  };

  const searchCustomObject = async ({
    objectTypeId,
    filterProperty,
    filterValue,
    properties: requestedProperties,
  }) => {
    const searchRes = await hsFetch(
      `https://api.hubapi.com/crm/v3/objects/${objectTypeId}/search`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${HUBSPOT_TOKEN}` },
        body: {
          limit: 1,
          filterGroups: [
            {
              filters: [
                {
                  propertyName: filterProperty,
                  operator: "EQ",
                  value: filterValue,
                },
              ],
            },
          ],
          properties: requestedProperties,
        },
      }
    );
    if (!searchRes.ok) {
      const message = await getHubSpotErrorMessage(searchRes);
      throw new Error(message);
    }

    const searchData = await searchRes.json();
    if (!Array.isArray(searchData?.results)) {
      throw new Error("Malformed search response from HubSpot");
    }

    return searchData.results[0] || null;
  };

  const getProposalManagerLookupValues = async (proposalManagerId) => {
    const normalizedProposalManager = toTrimmedString(proposalManagerId);
    if (!normalizedProposalManager) {
      return [];
    }

    const lookupValues = new Set([normalizedProposalManager]);
    if (!/^\d+$/.test(normalizedProposalManager)) {
      return Array.from(lookupValues);
    }

    const ownerRes = await hsFetch(
      `https://api.hubapi.com/crm/v3/owners/${normalizedProposalManager}?idProperty=id`,
      {
        headers: { Authorization: `Bearer ${HUBSPOT_TOKEN}` },
      }
    );

    if (!ownerRes.ok) {
      if (ownerRes.status !== 404) {
        const message = await getHubSpotErrorMessage(ownerRes);
        console.warn(
          `Owner lookup failed for proposal manager ${normalizedProposalManager}: ${message}`
        );
      }
      return Array.from(lookupValues);
    }

    const ownerData = await ownerRes.json();
    [
      ownerData?.id,
      ownerData?.userId,
      ownerData?.userIdIncludingInactive,
      ownerData?.email,
    ].forEach((candidateValue) => {
      const normalizedValue = toTrimmedString(candidateValue);
      if (normalizedValue) {
        lookupValues.add(normalizedValue);
      }
    });

    return Array.from(lookupValues);
  };

  const getUserRegionCode = async (proposalManagerId) => {
    const normalizedProposalManager = toTrimmedString(proposalManagerId);
    if (!normalizedProposalManager) {
      return DEFAULT_REGION_CODE;
    }

    const lookupValues = await getProposalManagerLookupValues(
      normalizedProposalManager
    );
    let foundUserMetaRecord = false;
    for (const lookupValue of lookupValues) {
      const userMetaRecord = await searchCustomObject({
        objectTypeId: USER_META_CUSTOM_OBJECT_TYPE_ID,
        filterProperty: USER_META_USER_PROPERTY,
        filterValue: lookupValue,
        properties: [REGION_CODE_PROPERTY],
      });
      if (!userMetaRecord) {
        continue;
      }

      foundUserMetaRecord = true;
      const regionCode = toTrimmedString(
        userMetaRecord?.properties?.[REGION_CODE_PROPERTY]
      );
      if (regionCode) {
        return regionCode;
      }
    }

    if (!foundUserMetaRecord) {
      console.warn(
        `No user metadata found for proposal manager: ${normalizedProposalManager}`
      );
    } else {
      console.warn(
        `No region code in user metadata for proposal manager: ${normalizedProposalManager}`
      );
    }

    return DEFAULT_REGION_CODE;
  };

  const getCurrencyConfig = async (regionCode) => {
    const normalizedRegionCode = toTrimmedString(regionCode) || DEFAULT_REGION_CODE;
    const currencyRecord = await searchCustomObject({
      objectTypeId: CURRENCY_CUSTOM_OBJECT_TYPE_ID,
      filterProperty: COMPANY_CODE_PROPERTY,
      filterValue: normalizedRegionCode,
      properties: [ALLOWED_CURRENCIES_PROPERTY],
    });

    if (!currencyRecord) {
      console.warn(`No currency config found for region: ${normalizedRegionCode}`);
      return null;
    }

    return currencyRecord.properties || null;
  };

  const getCurrencySettingsForDeal = async (dealProperties) => {
    try {
      const proposalManagerId = dealProperties?.[PROPOSAL_MANAGER_PROPERTY];

      if (!toTrimmedString(proposalManagerId)) {
        console.warn("No proposal manager on deal, using default region");
        const defaultCurrency = await getCurrencyConfig(DEFAULT_REGION_CODE);
        return {
          regionCode: DEFAULT_REGION_CODE,
          currencyConfig: defaultCurrency,
        };
      }

      const regionCode = await getUserRegionCode(proposalManagerId);
      const currencyConfig = await getCurrencyConfig(regionCode);

      return {
        regionCode,
        currencyConfig,
      };
    } catch (error) {
      console.error("Error fetching currency settings:", error);

      return {
        regionCode: DEFAULT_REGION_CODE,
        currencyConfig: null,
        error: error.message,
      };
    }
  };

  const resolveExpensesProperty = async () => {
    for (const propertyName of EXPENSES_PROPERTY_CANDIDATES) {
      const res = await hsFetch(
        `https://api.hubapi.com/crm/v3/properties/deals/${propertyName}`,
        {
          headers: { Authorization: `Bearer ${HUBSPOT_TOKEN}` },
        }
      );
      if (res.ok) return propertyName;
      if (res.status !== 404) {
        const message = await getHubSpotErrorMessage(res);
        throw new Error(message);
      }
    }

    return null;
  };

  const currencyOptions = useMemo(() => {
    const currentCurrency = properties?.[DEAL_CURRENCY_PROPERTY] || "";
    const next = allowedCurrencies.length
      ? Array.from(
          new Set(
            currentCurrency
              ? [currentCurrency, ...allowedCurrencies]
              : allowedCurrencies
          )
        )
      : currentCurrency
      ? [currentCurrency]
      : [];
    return next.map((code) => ({ value: code, label: code }));
  }, [allowedCurrencies, properties]);

  const allowedSelectValues = useMemo(
    () => ({
      [FEE_BASIS_PROPERTY]: new Set(feeBasisOptions.map((option) => option.value)),
      [CHARGE_TYPE_PROPERTY]: new Set(
        chargeTypeOptions.map((option) => option.value)
      ),
    }),
    [feeBasisOptions, chargeTypeOptions]
  );

  useEffect(() => {
    const fetchDealData = async () => {
      if (!dealId) return;
      setHasLoaded(false);
      setLoading(true);
      try {
        const [resolvedExpenses, feeBasisResult, chargeTypeResult] =
          await Promise.allSettled([
            resolveExpensesProperty(),
            fetchPropertyOptions(FEE_BASIS_PROPERTY),
            fetchPropertyOptions(CHARGE_TYPE_PROPERTY),
          ]);

        const expensesName =
          resolvedExpenses.status === "fulfilled"
            ? resolvedExpenses.value
            : null;
        setExpensesPropertyName(expensesName);
        if (!expensesName && resolvedExpenses.status === "fulfilled") {
          actions?.addAlert({
            title: "Expenses property not found",
            message: "The Expenses field will be read-only until configured.",
            type: "warning",
          });
        }
        if (resolvedExpenses.status === "rejected") {
          actions?.addAlert({
            title: "Expenses lookup failed",
            message: resolvedExpenses.reason?.message || "Please try again.",
            type: "error",
          });
        }

        if (feeBasisResult.status === "fulfilled") {
          setFeeBasisOptions(feeBasisResult.value);
        } else {
          setFeeBasisOptions([]);
          actions?.addAlert({
            title: "Fee basis options failed",
            message: feeBasisResult.reason?.message || "Please try again.",
            type: "error",
          });
        }

        if (chargeTypeResult.status === "fulfilled") {
          setChargeTypeOptions(chargeTypeResult.value);
        } else {
          setChargeTypeOptions([]);
          actions?.addAlert({
            title: "Charge type options failed",
            message: chargeTypeResult.reason?.message || "Please try again.",
            type: "error",
          });
        }

        const propertiesToFetch = [
          FEE_BASIS_PROPERTY,
          CHARGE_TYPE_PROPERTY,
          DEAL_STAGE_PROPERTY,
          DEAL_CURRENCY_PROPERTY,
          LABOUR_PROPERTY,
          THIRD_PARTY_FEES_PROPERTY,
          FGD_PERCENT_PROPERTY,
          PROPOSAL_MANAGER_PROPERTY,
          SUSTAIN_STATUS_PROPERTY,
        ];
        if (expensesName) propertiesToFetch.push(expensesName);

        const res = await hsFetch(
          `https://api.hubapi.com/crm/v3/objects/deals/${dealId}?properties=${propertiesToFetch.join(
            ","
          )}`,
          {
            headers: { Authorization: `Bearer ${HUBSPOT_TOKEN}` },
          }
        );

        if (!res.ok) {
          const message = await getHubSpotErrorMessage(res);
          throw new Error(message);
        }

        const data = await res.json();
        const props = data?.properties || {};

        const currencySettings = await getCurrencySettingsForDeal(props);
        const allowedValue =
          currencySettings?.currencyConfig?.[ALLOWED_CURRENCIES_PROPERTY] || "";
        const allowedCurrencyCodes = parseAllowedCurrencies(allowedValue);
        setAllowedCurrencies(allowedCurrencyCodes);
        if (!currencySettings?.currencyConfig && !currencySettings?.error) {
          actions?.addAlert({
            title: "Currency config missing",
            message: `No currency configuration found for region ${currencySettings.regionCode}.`,
            type: "warning",
          });
        }
        if (currencySettings?.error) {
          actions?.addAlert({
            title: "Allowed currencies failed",
            message: currencySettings.error,
            type: "error",
          });
        }

        setProperties(props);
        setDraftProperties(props);
        setSelectedCurrency(props?.[DEAL_CURRENCY_PROPERTY] || "");
        console.log("Sustain status on load:", props?.[SUSTAIN_STATUS_PROPERTY]);
        setSustainStatus(props?.[SUSTAIN_STATUS_PROPERTY] ?? null);
        setHasLoaded(true);
      } catch (error) {
        actions?.addAlert({
          title: "Error loading financial details",
          message: error.message,
          type: "error",
        });
        setHasLoaded(true);
      } finally {
        setLoading(false);
      }
    };

    fetchDealData();
  }, [dealId, actions]);

  const editableNumberProperties = useMemo(() => {
    const props = [LABOUR_PROPERTY, THIRD_PARTY_FEES_PROPERTY, FGD_PERCENT_PROPERTY];
    if (expensesPropertyName) props.push(expensesPropertyName);
    return props;
  }, [expensesPropertyName]);

  const isCurrencySelected = Boolean(selectedCurrency);
  const currentStage = toTrimmedString(properties?.[DEAL_STAGE_PROPERTY]);
  const isProposalInProgress = currentStage === PROPOSAL_IN_PROGRESS_STAGE;
  const isEditableDealStage =
    EDITABLE_DEAL_STAGES.has(currentStage) ||
    (isProposalInProgress && (!sustainStatus || sustainStatus === "unknown"));

  const handlePropertyChange = (name, value) => {
    if (!isEditableDealStage) {
      return;
    }
    if (!isCurrencySelected && editableNumberProperties.includes(name)) {
      return;
    }
    setDraftProperties((prev) => ({ ...prev, [name]: value }));
  };

  const handleCurrencyChange = (value) => {
    if (!isEditableDealStage) {
      return;
    }
    setSelectedCurrency(value || "");
    setDraftProperties((prev) => ({
      ...prev,
      [DEAL_CURRENCY_PROPERTY]: value || "",
    }));
  };

  const normalizeValue = (value) => {
    if (value === null || value === undefined) return "";
    return String(value);
  };

  const toNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const totalContractValue = useMemo(() => {
    const labour = toNumber(draftProperties[LABOUR_PROPERTY]);
    const expenses = expensesPropertyName
      ? toNumber(draftProperties[expensesPropertyName])
      : 0;
    const thirdParty = toNumber(draftProperties[THIRD_PARTY_FEES_PROPERTY]);
    const fgdPercent = toNumber(draftProperties[FGD_PERCENT_PROPERTY]);
    const fgd = labour * (fgdPercent);
    const total = labour + expenses + thirdParty + fgd;
    return Math.round(total * 100) / 100;
  }, [draftProperties, expensesPropertyName]);

  const buildPropertiesToSave = () => {
    if (!isEditableDealStage) {
      return {};
    }
    const next = {};
    const editableProperties = [
      FEE_BASIS_PROPERTY,
      CHARGE_TYPE_PROPERTY,
      DEAL_CURRENCY_PROPERTY,
      ...editableNumberProperties,
    ];

    editableProperties.forEach((property) => {
      if (!isCurrencySelected && editableNumberProperties.includes(property)) {
        return;
      }
      const currentValue = normalizeValue(properties[property]);
      const nextValue = normalizeValue(draftProperties[property]);
      if (currentValue !== nextValue) {
        const allowedValuesForProperty = allowedSelectValues[property];
        if (
          nextValue &&
          allowedValuesForProperty &&
          allowedValuesForProperty.size &&
          !allowedValuesForProperty.has(nextValue)
        ) {
          console.warn(
            `Skipping invalid value for ${property}: ${nextValue}. It is not in the allowed options.`
          );
          return;
        }
        next[property] = nextValue;
      }
    });

    return next;
  };

  const runAutoSave = async () => {
    if (!isEditableDealStage) return;
    if (savingRef.current) {
      pendingSaveRef.current = true;
      return;
    }

    const propertiesToSave = buildPropertiesToSave();
    
    // Round numeric properties to 1 decimal place for API
    const roundedProperties = {};
    Object.entries(propertiesToSave).forEach(([key, value]) => {
      if (editableNumberProperties.includes(key) && key !== FGD_PERCENT_PROPERTY) {
        const num = parseFloat(value);
        roundedProperties[key] = Number.isFinite(num) ? Math.round(num * 100) / 100 : value;
      } else if (key === FGD_PERCENT_PROPERTY) {
        const num = parseFloat(value);
        roundedProperties[key] = Number.isFinite(num) ? Math.round(num * 10000) / 10000 : value;
      } else {
        roundedProperties[key] = value;
      }
    });
    
    const moreproperties = {
      ...roundedProperties,
      deal_currency_code: selectedCurrency,
      amount: Math.round(totalContractValue * 100) / 100,
      commercials_updated_at: new Date().toISOString(),
    }
    if (!Object.keys(moreproperties).length) return;

    savingRef.current = true;
    setSaving(true);
    // console.log("Saving properties:", moreproperties);
    try {
      const res = await hsFetch(
        `https://api-eu1.hubapi.com/crm/v3/objects/deals/${dealId}`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${HUBSPOT_TOKEN}` },
          body: {
            properties: moreproperties,
          },
        }
      );

      if (!res.ok) {
        const message = await getHubSpotErrorMessage(res);
        throw new Error(message);
      }

      setProperties((prev) => ({
        ...prev,
        ...propertiesToSave,
      }));

      await actions?.refreshObjectProperties()

      // const res1 = await hsFetch(
      //   `https://api.hubapi.com/crm/v3/objects/deals/${dealId}`,
      //   {
      //     method: "PATCH",
      //     // headers: { Authorization: `Bearer ${HUBSPOT_TOKEN}` },
      //     body: {
      //       properties: moreproperties,
      //     },
      //   }
      // );

    } catch (error) {
      actions?.addAlert({
        title: "Auto-save failed",
        message: error.message,
        type: "error",
      });
    } finally {
      setSaving(false);
      savingRef.current = false;
      if (pendingSaveRef.current) {
        pendingSaveRef.current = false;
        runAutoSave();
      }
    }
  };

  useEffect(() => {
    if (!hasLoaded) return;
    
    // Skip auto-save on initial load
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      return;
    }
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      runAutoSave();
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [draftProperties, totalContractValue, hasLoaded]);

  const getSelectLabel = (options, value) => {
    if (!value) return "--";
    return options.find((o) => o.value === value)?.label || value;
  };

  const formatNum = (value, precision = 2) => {
    const num = parseFloat(value || 0);
    return Number.isFinite(num) ? num.toFixed(precision) : "--";
  };

  if (loading) {
    return (
      <Flex justify="center" align="center">
        <LoadingSpinner label="Loading financial details..." />
      </Flex>
    );
  }

  return (
    <Box>
      <Flex direction="column" gap="md">

        <Flex direction="column" gap="md">
          {/* Row 1 */}
          <Flex direction="row" gap="xl">
            <Flex direction="column" gap="xs" basis="25%">
              <Text variant="microcopy">Charge type 1</Text>
              {isEditableDealStage ? (
                <Select
                  name="charge_type"
                  value={draftProperties[CHARGE_TYPE_PROPERTY] || ""}
                  onChange={(val) => handlePropertyChange(CHARGE_TYPE_PROPERTY, val)}
                  options={chargeTypeOptions}
                  style={CLEAN_INPUT_STYLE}
                />
              ) : (
                <Text>{getSelectLabel(chargeTypeOptions, draftProperties[CHARGE_TYPE_PROPERTY])}</Text>
              )}
            </Flex>

            <Flex direction="column" gap="xs" basis="25%">
              <Text variant="microcopy">Fee Basis</Text>
              {isEditableDealStage ? (
                <Select
                  name="fee_basis"
                  value={draftProperties[FEE_BASIS_PROPERTY] || ""}
                  onChange={(val) => handlePropertyChange(FEE_BASIS_PROPERTY, val)}
                  options={feeBasisOptions}
                  style={CLEAN_INPUT_STYLE}
                />
              ) : (
                <Text>{getSelectLabel(feeBasisOptions, draftProperties[FEE_BASIS_PROPERTY])}</Text>
              )}
            </Flex>

            <Flex direction="column" gap="xs" basis="25%">
              <Text variant="microcopy">Deal Currency</Text>
              {isEditableDealStage ? (
                <Select
                  name="deal_currency"
                  placeholder="Select currency"
                  value={selectedCurrency}
                  onChange={handleCurrencyChange}
                  options={currencyOptions}
                  disabled={!currencyOptions.length}
                  style={CLEAN_INPUT_STYLE}
                />
              ) : (
                <Text>{selectedCurrency || "--"}</Text>
              )}
            </Flex>

            <Flex direction="column" gap="xs" basis="25%">
              <Text variant="microcopy">Labour</Text>
              {isEditableDealStage ? (
                <NumberInput
                  name="labour"
                  value={parseFloat(draftProperties[LABOUR_PROPERTY] || 0)}
                  onChange={(val) => handlePropertyChange(LABOUR_PROPERTY, val)}
                  style={CLEAN_INPUT_STYLE}
                  disabled={!isCurrencySelected}
                  precision={2}
                />
              ) : (
                <Text>{formatNum(draftProperties[LABOUR_PROPERTY])}</Text>
              )}
            </Flex>
          </Flex>

          {/* Row 2 */}
          <Flex direction="row" gap="xl">
            <Flex direction="column" gap="xs" basis="25%">
              <Text variant="microcopy">Expenses</Text>
              {isEditableDealStage ? (
                <NumberInput
                  name="expenses"
                  value={parseFloat(
                    (expensesPropertyName ? draftProperties[expensesPropertyName] : 0) || 0
                  )}
                  onChange={(val) =>
                    expensesPropertyName && handlePropertyChange(expensesPropertyName, val)
                  }
                  style={CLEAN_INPUT_STYLE}
                  disabled={!isCurrencySelected || !expensesPropertyName}
                  precision={2}
                />
              ) : (
                <Text>{formatNum(expensesPropertyName ? draftProperties[expensesPropertyName] : 0)}</Text>
              )}
            </Flex>

            <Flex direction="column" gap="xs" basis="25%">
              <Text variant="microcopy">3rd Party Fees</Text>
              {isEditableDealStage ? (
                <NumberInput
                  name="third_party_fees"
                  value={parseFloat(draftProperties[THIRD_PARTY_FEES_PROPERTY] || 0)}
                  onChange={(val) => handlePropertyChange(THIRD_PARTY_FEES_PROPERTY, val)}
                  style={CLEAN_INPUT_STYLE}
                  disabled={!isCurrencySelected}
                  precision={2}
                />
              ) : (
                <Text>{formatNum(draftProperties[THIRD_PARTY_FEES_PROPERTY])}</Text>
              )}
            </Flex>

            <Flex direction="column" gap="xs" basis="25%">
              <Text variant="microcopy">FGD %</Text>
              {isEditableDealStage ? (
                <NumberInput
                  name="fgd_percent"
                  value={parseFloat((draftProperties[FGD_PERCENT_PROPERTY] * 100) || 0)}
                  onChange={(val) => handlePropertyChange(FGD_PERCENT_PROPERTY, val / 100)}
                  style={CLEAN_INPUT_STYLE}
                  disabled={!isCurrencySelected}
                  precision={2}
                  max={10}
                />
              ) : (
                <Text>{formatNum(draftProperties[FGD_PERCENT_PROPERTY] * 100)}%</Text>
              )}
            </Flex>

            <Flex direction="column" gap="xs" basis="25%">
              <Flex align="center" gap="xs">
                <Text variant="microcopy">Total Contract Value</Text>
                <Text variant="microcopy">ⓘ</Text>
              </Flex>
              <Text>{totalContractValue || "--"}</Text>
            </Flex>
          </Flex>
        </Flex>

      </Flex>
    </Box>
  );
};

hubspot.extend(({ context, actions }) => (
  <FinancialDetailsCard context={context} actions={actions} />
));
