import { useState, useEffect } from "react";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";

const NAMESPACE = "siteguard";
const KEY = "config";

const DEFAULTS = {
  protection: {
    rightClick: true,
    textSelect: true,
    images: true,
    shortcuts: true,
  },
  country: {
    enabled: false,
    codes: "",
    message: "Access not available in your region",
  },
  gdpr: {
    enabled: false,
    text: "We use cookies to improve your experience on our site.",
    button: "Accept",
  },
  age: {
    enabled: false,
    text: "You must be 18 or older to enter this site.",
    yesButton: "I am 18 or older",
    noButton: "Exit",
    exitUrl: "https://www.google.com",
  },
};

const mergeConfig = (saved = {}) => ({
  protection: { ...DEFAULTS.protection, ...saved.protection },
  country: { ...DEFAULTS.country, ...saved.country },
  gdpr: { ...DEFAULTS.gdpr, ...saved.gdpr },
  age: { ...DEFAULTS.age, ...saved.age },
});

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const res = await admin.graphql(
    `#graphql
    query SiteGuardConfig($namespace: String!, $key: String!) {
      currentAppInstallation {
        id
        metafield(namespace: $namespace, key: $key) {
          value
        }
      }
    }`,
    { variables: { namespace: NAMESPACE, key: KEY } },
  );
  const json = await res.json();
  const raw = json.data.currentAppInstallation.metafield?.value;
  let saved = {};
  try {
    saved = raw ? JSON.parse(raw) : {};
  } catch (e) {
    saved = {};
  }
  return { config: mergeConfig(saved) };
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const config = mergeConfig(JSON.parse(formData.get("config") || "{}"));

  const installRes = await admin.graphql(
    `#graphql
    query AppInstallId {
      currentAppInstallation {
        id
      }
    }`,
  );
  const installJson = await installRes.json();
  const ownerId = installJson.data.currentAppInstallation.id;

  const res = await admin.graphql(
    `#graphql
    mutation SaveSiteGuard($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { id }
        userErrors { field message }
      }
    }`,
    {
      variables: {
        metafields: [
          {
            ownerId,
            namespace: NAMESPACE,
            key: KEY,
            type: "json",
            value: JSON.stringify(config),
          },
        ],
      },
    },
  );
  const json = await res.json();
  const errors = json.data.metafieldsSet.userErrors;
  return { ok: errors.length === 0, errors };
};

export default function Index() {
  const { config: initial } = useLoaderData();
  const [cfg, setCfg] = useState(initial);
  const fetcher = useFetcher();
  const shopify = useAppBridge();

  const isSaving =
    ["loading", "submitting"].includes(fetcher.state) &&
    fetcher.formMethod === "POST";

  useEffect(() => {
    if (fetcher.data?.ok) shopify.toast.show("Settings saved");
    if (fetcher.data && !fetcher.data.ok)
      shopify.toast.show("Save failed", { isError: true });
  }, [fetcher.data, shopify]);

  const set = (section, key, value) =>
    setCfg((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));

  const save = () =>
    fetcher.submit({ config: JSON.stringify(cfg) }, { method: "POST" });

  return (
    <s-page heading="SiteGuard Shield">
      <s-button
        slot="primary-action"
        variant="primary"
        onClick={save}
        {...(isSaving ? { loading: true } : {})}
      >
        Save
      </s-button>

      <s-section heading="Content Protection">
        <s-paragraph>
          Stop visitors from copying your content and images.
        </s-paragraph>
        <s-stack direction="block" gap="base">
          <s-switch
            label="Disable right click"
            checked={cfg.protection.rightClick}
            onChange={(e) =>
              set("protection", "rightClick", e.currentTarget.checked)
            }
          />
          <s-switch
            label="Disable text selection & copy"
            checked={cfg.protection.textSelect}
            onChange={(e) =>
              set("protection", "textSelect", e.currentTarget.checked)
            }
          />
          <s-switch
            label="Disable image drag & save"
            checked={cfg.protection.images}
            onChange={(e) =>
              set("protection", "images", e.currentTarget.checked)
            }
          />
          <s-switch
            label="Disable keyboard shortcuts (F12, Ctrl+U/S/P, DevTools)"
            checked={cfg.protection.shortcuts}
            onChange={(e) =>
              set("protection", "shortcuts", e.currentTarget.checked)
            }
          />
        </s-stack>
      </s-section>

      <s-section heading="Country Blocker">
        <s-stack direction="block" gap="base">
          <s-switch
            label="Enable country blocker"
            checked={cfg.country.enabled}
            onChange={(e) => set("country", "enabled", e.currentTarget.checked)}
          />
          <s-text-field
            label="Blocked country codes"
            details="Comma separated 2-letter codes, e.g. CN,RU,PK"
            value={cfg.country.codes}
            onInput={(e) => set("country", "codes", e.currentTarget.value)}
          />
          <s-text-field
            label="Message shown to blocked visitors"
            value={cfg.country.message}
            onInput={(e) => set("country", "message", e.currentTarget.value)}
          />
        </s-stack>
      </s-section>

      <s-section heading="GDPR Cookie Banner">
        <s-stack direction="block" gap="base">
          <s-switch
            label="Show cookie banner"
            checked={cfg.gdpr.enabled}
            onChange={(e) => set("gdpr", "enabled", e.currentTarget.checked)}
          />
          <s-text-area
            label="Banner text"
            rows={3}
            value={cfg.gdpr.text}
            onInput={(e) => set("gdpr", "text", e.currentTarget.value)}
          />
          <s-text-field
            label="Button text"
            value={cfg.gdpr.button}
            onInput={(e) => set("gdpr", "button", e.currentTarget.value)}
          />
        </s-stack>
      </s-section>

      <s-section heading="Age Verification Popup">
        <s-stack direction="block" gap="base">
          <s-switch
            label="Show age verification popup"
            checked={cfg.age.enabled}
            onChange={(e) => set("age", "enabled", e.currentTarget.checked)}
          />
          <s-text-area
            label="Popup text"
            rows={3}
            value={cfg.age.text}
            onInput={(e) => set("age", "text", e.currentTarget.value)}
          />
          <s-text-field
            label="Confirm button text"
            value={cfg.age.yesButton}
            onInput={(e) => set("age", "yesButton", e.currentTarget.value)}
          />
          <s-text-field
            label="Exit button text"
            value={cfg.age.noButton}
            onInput={(e) => set("age", "noButton", e.currentTarget.value)}
          />
          <s-text-field
            label="Redirect URL when visitor clicks Exit"
            value={cfg.age.exitUrl}
            onInput={(e) => set("age", "exitUrl", e.currentTarget.value)}
          />
        </s-stack>
      </s-section>

      <s-section slot="aside" heading="How it works">
        <s-paragraph>
          After saving, turn on the <s-text type="strong">SiteGuard Protection</s-text>{" "}
          app embed in your theme editor (Online Store → Customize → App embeds).
        </s-paragraph>
        <s-paragraph>
          These protections discourage casual copying. They cannot fully stop
          determined scrapers.
        </s-paragraph>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};