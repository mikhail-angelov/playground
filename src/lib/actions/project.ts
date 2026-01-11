"use server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { v4 } from "uuid";
import { db, projects } from "@/db";
import { getAuthUser, AUTH_COOKIE } from "@/services/authService";
import { getProfile } from "@/services/profileService";
import { ProjectDto } from "@/dto/project.dto";

const initialFileContents =  {
          "index.html": `<canvas id="canvas" tabindex="0" style:"width:100%; height:100%; border:1px solid;"></canvas>`,
          "style.css":
            "html{ width:100%; height:100%; background-color: #333; color:  #f0f0f0; margin:0px; padding:0px; display:flex; flex-direction:column;} canvas { flex:1; margin:5px; }",
          "script.js": 'console.log("Hello, World!");',
        }

export async function getProject(
  projectId: string,
): Promise<[project?: ProjectDto, error?: string]> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  let myEmail = "";
  let hasAi = false;

  try {
    const {id, email } = await getAuthUser(token);
    const profile = await getProfile(id);
    myEmail = email;
    hasAi = !!profile?.key;
  } catch (e) {
    //ignore
  }

  if (!projectId || projectId === "new") {
    return [
      {
        isMy: true,
        hasAi,
        email: myEmail,
        name: "New Project",
        projectId: v4(),
        lastPublish: "",
        error: "",
        isLoading: false,
        selectedFile: "index.html",
        fileContents: initialFileContents,
        preview: "",
        tags: [],
        url: "",
      },
    ];
  }

  //load fileContents
  try {
    //load Project
    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.projectId, projectId))
      .get();
      console.log("---Project loaded:", project);
    if (!project) {
      return [
        {
          isMy: true,
          hasAi,
          email: myEmail,
          name: "New Project",
          projectId: v4(),
          lastPublish: "",
          error: "",
          isLoading: false,
          selectedFile: "index.html",
          fileContents: initialFileContents,
          preview: "",
          tags: [],
          url: "",
        },
      ];
    }
    const response = await fetch(`${process.env.APP_HOST}/${projectId}`);

    if (response.ok) {
      const { content } = await response.json();
      return [
        {
          isMy: myEmail === project.email,
          hasAi,
          fileContents: content,
          selectedFile: "index.html",
          projectId,
          email: project.email,
          name: project.name,
          error: "",
          isLoading: false,
          lastPublish: "",
          preview: "",
          tags: project.tags,
          url: `${process.env.APP_HOST}/${projectId}.html`,
        },
      ];
    } else {
      console.error("Failed to load file contents:", response.statusText);
      return [undefined, "Failed to load file content"];
    }
  } catch (err) {
    console.error("Error loading file contents:", err);
    return [undefined, "Failed to load project"];
  }
}
