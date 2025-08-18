import { generatePreviewHtml } from "./projectsService";
import ejs from "ejs";

// Mock the EJS module to use the actual implementation
jest.mock("ejs", () => ({
  render: jest.requireActual("ejs").render,
  renderFile: jest.fn(),
}));

// Example template string for testing (simplified)
const previewTemplate = `
<html>
  <head>
    <title><%= name %></title>
    <style><%- cssContent %></style>
  </head>
  <body>
    <div id="project-content"><%- htmlContent %></div>
    <script><%- jsContent %></script>
  </body>
</html>
`;

describe("generatePreviewHtml", () => {
  beforeAll(() => {
    // Patch ejs.renderFile to use our test template string
    (ejs.renderFile as jest.Mock).mockImplementation((_, data) =>
      Promise.resolve(ejs.render(previewTemplate, data))
    );
  });

  it("should generate HTML with embedded content", async () => {
    const result = await generatePreviewHtml({
      name: "Test Project",
      projectId: "abc123",
      content: {
        "index.html": "<h1>Hello World</h1>",
        "style.css": "body { background: #fff; }",
        "script.js": "console.log('Hello');",
      },
    });

    expect(result).toContain("<title>Test Project</title>");
    expect(result).toContain("<h1>Hello World</h1>");
    expect(result).toContain("body { background: #fff; }");
    expect(result).toContain("console.log('Hello');");
    expect(result).toContain('<div id="project-content"><h1>Hello World</h1></div>');
  });

  it("should handle missing content gracefully", async () => {
    const result = await generatePreviewHtml({
      name: "Empty Project",
      projectId: "empty123",
      content: {},
    });

    expect(result).toContain("<title>Empty Project</title>");
    expect(result).toContain('<div id="project-content"></div>');
  });
});
