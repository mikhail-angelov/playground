import ejs from "ejs";
import path from "path";

describe("preview.ejs template", () => {
  const templatePath = path.resolve(__dirname, "preview.ejs");

  it("should render the template with the provided data", async () => {
    // Mock data
    const mockData = {
      name: "My Awesome Project",
      projectUrl: "https://example.com/view/12345",
      image: "https://example.com/images/project-preview.png",
      htmlContent: "<div><h2>Welcome to My Project</h2><p>This is a demo project.</p></div>",
      cssContent: "body { background-color: #f0f0f0; } h2 { color: #333; }",
      jsContent: "console.log('Project loaded successfully!');",
    };

    // Render the template
    const renderedHtml = await ejs.renderFile(templatePath, mockData);

    // Assertions
    expect(renderedHtml).toContain("<title>My Awesome Project</title>");
    expect(renderedHtml).toContain('<meta property="og:title" content="My Awesome Project">');
    expect(renderedHtml).toContain('<meta property="og:image" content="https://example.com/images/project-preview.png">');
    expect(renderedHtml).toContain('<meta property="og:url" content="https://example.com/view/12345">');
    expect(renderedHtml).toContain("<style>body { background-color: #f0f0f0; } h2 { color: #333; }</style>");
    expect(renderedHtml).toContain('<div><h2>Welcome to My Project</h2><p>This is a demo project.</p></div>');
    expect(renderedHtml).toContain("<script>console.log('Project loaded successfully!');</script>");
  });

  it("should handle missing optional fields gracefully", async () => {
    // Mock data with missing optional fields
    const mockData = {
      name: "My Project",
      projectUrl: "https://example.com/view/67890",
      image: "https://example.com/images/default.png",
      htmlContent: "",
      cssContent: "",
      jsContent: "",
    };

    // Render the template
    const renderedHtml = await ejs.renderFile(templatePath, mockData);

    // Assertions
    expect(renderedHtml).toContain("<title>My Project</title>");
    expect(renderedHtml).toContain('<meta property="og:title" content="My Project">');
    expect(renderedHtml).toContain('<meta property="og:image" content="https://example.com/images/default.png">');
    expect(renderedHtml).toContain('<meta property="og:url" content="https://example.com/view/67890">');
    expect(renderedHtml).not.toContain("<style>");
    expect(renderedHtml).not.toContain("<script>");
    expect(renderedHtml).toContain('<div id="project-content"></div>');
  });
});