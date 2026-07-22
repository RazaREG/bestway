import React from "react";
import Container from "react-bootstrap/Container";

export default function PrivacyPolicy() {
  return (
    <Container className="py-4" style={{ maxWidth: 900 }}>
      <h1>Privacy Policy</h1>
      <p><strong>Last updated:</strong> January 2026</p>

      <p>
        Bestway we operates the Bestway mobile application
        (the “App”).
      </p>

      <h4>Information We Collect</h4>
      <ul>
        <li>User Activities</li>
        <li>User role and work information</li>
        <li>App usage data</li>
      </ul>

      <h4>How We Use Information</h4>
      <ul>
        <li>Manage user accounts</li>
        <li>Provide app services</li>
        <li>Improve app performance</li>
        <li>Ensure security</li>
      </ul>

      <h4>Data Storage & Security</h4>
      <p>
        Data is securely stored using trusted third-party services.
      </p>

      <h4>Data Deletion</h4>
      <p>
        To request deletion of your data, contact us at:
        <br />
        <strong>support@bestwayinsulation.ca</strong>
      </p>

      <h4>Children’s Privacy</h4>
      <p>
        This app is not intended for children under 13.
      </p>

      <h4>Contact Us</h4>
      <p>
        Email: <strong> support@bestwayinsulation.ca</strong>
      </p>
    </Container>
  );
}
