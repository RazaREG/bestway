import React from "react";
import Container from "react-bootstrap/Container";
import PullToRefresh from "react-simple-pull-to-refresh";

export default function AppVerification() {

  const handleRefresh = async () => {
    window.location.reload();
    return true;
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <Container className="py-4" style={{ maxWidth: 900 }}>
        <h1>App Verification</h1>
        <p><strong>Last updated:</strong> March 30, 2026</p>
        <p><strong>Appeal Submitted to Google Play:</strong> March 30, 2026</p>

        <p>
          This page is created to verify the ownership and authorization of the
          mobile application listed on Google Play.
        </p>

        <h4>Application Details</h4>
        <ul>
          <li><strong>App Name:</strong> Bestway Insulation</li>
          <li><strong>Package Name:</strong> com.bestway.panel</li>
          <li><strong>Developer / Owner:</strong> Bestway Insulation</li>
          <li>
            <strong>Official Website:</strong> https://bestway.pourcrete.com
          </li>
          <li>
            <strong>Google Play Developer Account:</strong> Alit590 (Personal Account)
          </li>
        </ul>

        <h4>Ownership Declaration</h4>
        <p>
          We confirm that the above-mentioned mobile application and the website
          https://bestway.pourcrete.com are fully owned and operated by Bestway Insulation.
        </p>

        <p>
          The mobile application is an official extension of our website and is
          developed to provide mobile access to our business services and user
          workflows.
        </p>

        <h4>Native App Functionality</h4>
        <p>
          The mobile application is not a simple webview wrapper. It provides
          secure, authenticated, and role-based access to an internal business system.
        </p>

        <ul>
          <li>Secure user authentication powered by Supabase</li>
          <li>Role-based access control (Admin, Manager, Staff users)</li>
          <li>Internal job and workflow management system</li>
          <li>User-specific dashboards and restricted data access</li>
          <li>Mobile-optimized interface for field operations</li>
        </ul>

        <p>
          Access to the application is restricted to authorized users only. Public users
          cannot access the system without valid login credentials.
        </p>

        <p>
          This application is not intended for general public browsing and provides
          functionality beyond simply viewing a website.
        </p>

        <h4>Content Authorization</h4>
        <p>
          We have full legal rights and authorization to display, distribute, and
          use all content available within the application, including content
          loaded via WebView from our official domain.
        </p>

        <p>
          This application does not use third-party or unauthorized content and is
          not an affiliate or spam-based application.
        </p>

        <h4>Purpose of the Application</h4>
        <ul>
          <li>Provide mobile access to internal job management system</li>
          <li>Allow users to manage tasks, roles, and workflows</li>
          <li>Improve operational efficiency via mobile platform</li>
        </ul>

        <h4>Contact Information</h4>
        <p>
          Email: <strong>support@pourcrete.com</strong>
          <br />
          Website: <strong>https://bestway.pourcrete.com</strong>
        </p>

        <h4>Verification Statement</h4>
        <p>
          This page serves as an official public verification that the mobile
          application "Bestway Insulation" (com.bestway.panel) is directly
          associated with and authorized by the owner of this domain.
        </p>

        <p>
          For Google Play review purposes, this page confirms that the application listed under the Google Play Developer account <strong>Alit590</strong> (Personal Account) is officially owned and managed by Bestway Insulation.
        </p>

        <p>
          <strong>Note:</strong> Bestway Insulation operates under Pourcrete.
        </p>
      </Container>
    </PullToRefresh>
  );
}