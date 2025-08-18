"use server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { v4 } from "uuid";
import { db, projects } from "@/db";
import { getAuthUser, AUTH_COOKIE } from "@/services/authService";
import { getProfile } from "@/services/profileService";
import { ProjectDto } from "@/dto/project.dto";

export async function getProject(
  projectId: string,
): Promise<[project?: ProjectDto, error?: string]> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  let myEmail = "";
  let hasAi = false;

  try {
    const user = await getAuthUser(token);
    const profile = await getProfile(user.id);
    myEmail = user?.email;
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
        fileContents: {
          "index.html": `<canvas id="canvas" tabindex="0" style:"width:100%; height:100%; border:1px solid;"></canvas>`,
          "style.css":
            "html{ width:100%; height:100%; background-color: #333; color:  #f0f0f0; margin:0px; padding:0px; display:flex; flex-direction:column;} canvas { flex:1; margin:5px; }",
          "script.js": 'console.log("Hello, World!");',
        },
        preview: "",
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
          fileContents: {
            "index.html": `<canvas id="canvas" tabindex="0" style:"width:100%; height:100%; border:1px solid;"></canvas>`,
            "style.css":
              "html{ width:100%; height:100%; background-color: #333; color:  #f0f0f0; margin:0px; padding:0px; display:flex; flex-direction:column;} canvas { flex:1; margin:5px; }",
            "script.js": 'console.log("Hello, World!");',
          },
          preview: "",
        },
      ];
    }
    const response = await fetch(`${"https://app.js2go.ru"}/${projectId}`);

    if (response.ok) {
      const { content, email, name = "" } = await response.json();
      return [
        {
          isMy: myEmail === email,
          hasAi,
          fileContents: content,
          selectedFile: "index.html",
          projectId,
          email,
          name,
          error: "",
          isLoading: false,
          lastPublish: "",
          preview: "",
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
