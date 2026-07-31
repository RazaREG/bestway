import React from "react";
import Container from "react-bootstrap/Container";

export default function PrivacyPolicy() {
  return (
    <Container className="py-4" style={{ maxWidth: 900 }}>
      <h1>Privacy Policy</h1>
      <p>
        <strong>Last updated:</strong> July 31, 2026
      </p>

      <p>
        Bestway operates the Bestway Panel mobile and web application (the
        "App"). The App is used for internal job scheduling, crew management,
        work status updates, inventory records, and job completion workflows.
      </p>

      <h4>Information We Collect</h4>
      <p>
        We collect information needed to provide the App's business functions,
        including:
      </p>
      <ul>
        <li>
          Account information such as user name, email or login identifier,
          role, and permissions.
        </li>
        <li>
          Job information such as assigned crew, schedule, address, job notes,
          status, and completion details.
        </li>
        <li>
          Work session information such as start time, end time, and hours
          worked.
        </li>
        <li>
          Photos, files, inventory usage, or other job records uploaded by
          authorized users.
        </li>
        <li>
          Basic technical information used to maintain security and app
          functionality.
        </li>
      </ul>

      <h4>How We Use Information</h4>
      <ul>
        <li>Manage user accounts and access permissions.</li>
        <li>Schedule, assign, track, and complete jobs.</li>
        <li>Calculate and review worker hours and job activity.</li>
        <li>Manage inventory and operational records.</li>
        <li>Maintain app security, reliability, and performance.</li>
      </ul>

      <h4>Data Storage and Security</h4>
      <p>
        Data is stored using trusted third-party services and protected with
        access controls. Only authorized users can access app data according to
        their assigned role.
      </p>

      <h4>Data Sharing</h4>
      <p>
        We do not sell personal information. Information may be processed by
        service providers used to operate the App, such as hosting, database,
        authentication, storage, and support services.
      </p>

      <h4>Tracking</h4>
      <p>
        The App does not track users across apps or websites owned by other
        companies for advertising purposes.
      </p>

      <h4>Data Deletion</h4>
      <p>
        To request access, correction, or deletion of your data, contact us at:
        <br />
        <strong>support@bestwayinsulation.ca</strong>
      </p>

      <h4>Children's Privacy</h4>
      <p>This app is not intended for children under 13.</p>

      <h4>Contact Us</h4>
      <p>
        Email: <strong>support@bestwayinsulation.ca</strong>
      </p>
    </Container>
  );
}
