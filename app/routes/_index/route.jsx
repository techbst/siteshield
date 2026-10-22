import { redirect, Form, useLoaderData } from "react-router";

import { login } from "../../shopify.server";

import styles from "./styles.module.css";

export const loader = async ({ request }) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function App() {
  const { showForm } = useLoaderData();

  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <h1 className={styles.heading}>SiteGuard Shield</h1>
        <p className={styles.text}>
          Protect your store content from copying. Block right-click, text
          selection and image saving, restrict visitors by country, and show
          cookie and age verification popups.
        </p>
        {showForm && (
          <Form className={styles.form} method="post" action="/auth/login">
            <label className={styles.label}>
              <span>Shop domain</span>
              <input className={styles.input} type="text" name="shop" />
              <span>e.g: my-shop-domain.myshopify.com</span>
            </label>
            <button className={styles.button} type="submit">
              Log in
            </button>
          </Form>
        )}
        <ul className={styles.list}>
          <li>
            <strong>Content protection</strong>. Disable right-click, text
            selection, image drag and developer shortcuts.
          </li>
          <li>
            <strong>Country blocker</strong>. Block visitors from the
            countries you choose.
          </li>
          <li>
            <strong>Popups</strong>. Add a GDPR cookie banner and an age
            verification popup in a few clicks.
          </li>
        </ul>
      </div>
    </div>
  );
}