import { createTestDb } from "@/test/sqliteTestUtils";
import * as projectsService from "./projectsService";
import { users, projects } from "@/db/schema";
import { generatePreviewHtml } from "./projectsService";
import ejs from "ejs";

// Mock the EJS module to use the actual implementation
jest.mock("ejs", () => ({
  render: jest.requireActual("ejs").render,
  renderFile: jest.fn(),
}));

// Mock S3 upload to avoid S3_BUCKET errors
jest.mock("./s3Service", () => ({
  ...jest.requireActual("./s3Service"),
  uploadFileToS3: jest.fn().mockResolvedValue("mocked-key"),
}));

describe("projectsService", () => {
  let db: ReturnType<typeof createTestDb>["db"];

  beforeEach(() => {
    ({ db } = createTestDb());
    // Insert a user and a project for testing
    db.insert(users).values({ id: 1, email: "test@example.com" }).run();
    db.insert(projects)
      .values({
        id: 1,
        name: "Test Project",
        userId: 1,
        image: null,
        projectId: "abc123",
        email: "test@example.com",
        tags: [],
      })
      .run();
  });


  it("getBestProjectsWithDb returns projects", () => {
    const result = projectsService.getBestProjectsWithDb(db, 1);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Test Project");
  });

  it("getBestProjectsWithDb returns empty if no projects", () => {
    // Clear projects table
    db.run("DELETE FROM projects");
    const result = projectsService.getBestProjectsWithDb(db, 1);
    expect(result).toHaveLength(0);
  });

  it("getMyProjectsWithDb returns user projects", () => {
    const result = projectsService.getMyProjectsWithDb(db, 1);
    expect(result).toHaveLength(1);
    expect(result[0].userEmail).toBe("test@example.com");
  });

  it("getMyProjectsWithDb returns empty for unknown user", () => {
    const result = projectsService.getMyProjectsWithDb(db, 999);
    expect(result).toHaveLength(0);
  });


  it("upload creates a new project and getProject returns it", async () => {
    // Insert a new user
    db.insert(users).values({ id: 2, email: "user2@example.com" }).run();
    const projectId = "newproj123";
    const result = await projectsService.upload({
      name: "New Project",
      projectId,
      content: { "index.html": "<h1>Hello</h1>" },
      image: Buffer.from("test").toString("base64"),
      userId: 2,
      email: "user2@example.com",
      tags: ["tag1"],
      dbInstance: db,
    });
    expect(result.name).toBe("New Project");
    expect(result.projectId).toBe(projectId);
    const fetched = await projectsService.getProject(
      projectId,
      "user2@example.com",
      db
    );
    expect(fetched.name).toBe("New Project");
    expect(fetched.projectId).toBe(projectId);
    expect(fetched.email).toBe("user2@example.com");
  });

  it("upload throws if projectId exists for another user", async () => {
    // Insert a second user
    db.insert(users).values({ id: 3, email: "other@example.com" }).run();
    // Try to upload with existing projectId but different userId
    await expect(
      projectsService.upload({
        name: "Dup Project",
        projectId: "abc123",
        content: { "index.html": "<h1>Dup</h1>" },
        image: Buffer.from("test").toString("base64"),
        userId: 3,
        email: "other@example.com",
        tags: ["dup"],
        dbInstance: db,
      })
    ).rejects.toThrow("File with the same key already exists for another user");
  });


  it("updateProject updates project fields", async () => {
    // Update the existing project
    await projectsService.updateProject("abc123", { name: "Updated Name" }, db);
    const updated = await projectsService.getProject(
      "abc123",
      "test@example.com",
      db
    );
    expect(updated.name).toBe("Updated Name");
  });

  it("updateProject does not throw for non-existent project", async () => {
    // Should not throw, but also not update anything
    await expect(
      projectsService.updateProject("notfound", { name: "Nope" }, db)
    ).resolves.not.toThrow();
    // Still not found
    await expect(
      projectsService.getProject("notfound", "nobody@example.com", db)
    ).rejects.toThrow("Project not found");
  });


  it("upload throws if required fields are missing", async () => {
    await expect(
      projectsService.upload({
        // missing name, projectId, content, image, userId, email, tags
        name: "",
        projectId: "",
        content: {},
        image: "",
        userId: undefined as any,
        email: "",
        tags: [],
        dbInstance: db,
      })
    ).rejects.toThrow();
  });

  it("updateProject with empty updates throws error", async () => {
    await expect(
      projectsService.updateProject("abc123", {}, db)
    ).rejects.toThrow("No values to set");
  });

  it("getProject throws for null/undefined projectId", async () => {
    await expect(
      projectsService.getProject(null as any, "test@example.com", db)
    ).rejects.toThrow();
    await expect(
      projectsService.getProject(undefined as any, "test@example.com", db)
    ).rejects.toThrow();
  });

  it("upload handles invalid base64 image string gracefully", async () => {
    db.insert(users).values({ id: 4, email: "imgfail@example.com" }).run();
    const projectId = "imgfail123";
    await expect(
      projectsService.upload({
        name: "Bad Image",
        projectId,
        content: { "index.html": "<h1>Bad</h1>" },
        image: "not_base64",
        userId: 4,
        email: "imgfail@example.com",
        tags: ["fail"],
        dbInstance: db,
      })
    ).resolves.toBeDefined();
    const fetched = await projectsService.getProject(projectId, "imgfail@example.com", db);
    expect(fetched.name).toBe("Bad Image");
  });
});

describe("generatePreviewHtml", () => {
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
    expect(result).toContain(
      '<div id="project-content"><h1>Hello World</h1></div>'
    );
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
