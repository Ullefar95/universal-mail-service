import React from "react";

const ApiKeysPage: React.FC = () => {
  return (
    <div className="space-y-4 p-6">
      <h1 className="text-2xl font-bold">API Documentation</h1>
      <p className="text-gray-600">
        Welcome to the Universal Mail Service API documentation. This guide
        explains how to authenticate your requests, interact with various
        endpoints, and understand request/response structures.
      </p>

      {/* Authentication Section */}
      <div className="mt-6">
        <h2 className="text-xl font-semibold">Authentication</h2>
        <p className="text-sm text-gray-600">
          All API requests require authentication using an API key. Include the
          API key in the request headers as shown below:
        </p>
        <pre className="p-4 bg-gray-100 rounded text-sm text-gray-800">
          {`GET /api/v1/resource
Headers:
  x-api-key: your-api-key`}
        </pre>
      </div>

      {/* Endpoints Overview Section */}
      <div className="mt-6">
        <h2 className="text-xl font-semibold">Endpoints Overview</h2>
        <ul className="list-disc list-inside text-sm text-gray-600">
          <li>
            <strong>GET /templates</strong>: Retrieve all active templates.
          </li>
          <li>
            <strong>GET /templates/{`{id}`}</strong>: Retrieve a specific
            template by ID.
          </li>
          <li>
            <strong>POST /templates</strong>: Create a new template.
          </li>
          <li>
            <strong>PUT /templates/{`{id}`}</strong>: Update an existing
            template.
          </li>
          <li>
            <strong>DELETE /templates/{`{id}`}</strong>: Delete a template.
          </li>
          <li>
            <strong>POST /emails/send</strong>: Send a single email.
          </li>
          <li>
            <strong>POST /emails/batch</strong>: Send a batch of emails.
          </li>
          <li>
            <strong>GET /emails/status/{`{id}`}</strong>: Get the status of a
            specific email.
          </li>
        </ul>
      </div>

      {/* Example Request Section */}
      <div className="mt-6">
        <h2 className="text-xl font-semibold">Example Request</h2>
        <pre className="p-4 bg-gray-100 rounded text-sm text-gray-800">
          {`POST /api/v1/templates
Headers:
  Content-Type: application/json
  x-api-key: your-api-key
Body:
{
  "name": "Welcome Email",
  "subject": "Welcome to Our Service!",
  "content": {
    "html": "<h1>Hello</h1>",
    "text": "Hello"
  },
  "isActive": true
}`}
        </pre>
      </div>

      {/* Explore More Section */}
      <div className="mt-6">
        <h2 className="text-xl font-semibold">Explore More</h2>
        <p className="text-sm text-gray-600">
          For detailed API specifications and to try out live requests, visit
          the full OpenAPI documentation:
        </p>
        <a
          href="/api-docs"
          className="text-blue-500 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          OpenAPI Documentation
        </a>
      </div>
    </div>
  );
};

export default ApiKeysPage;
