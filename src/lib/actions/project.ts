"use server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { v4 } from "uuid";
import { db, projects } from "@/db";
import { getAuthUser, AUTH_COOKIE } from "@/services/authService";
import { getProfile, saveProfile } from "@/services/profileService";

export async function getProject(projectId: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  let myEmail = "";
  let hasAi = false;

  try {
    const user = await getAuthUser(token);
    const profile = await getProfile(user.id);
    console.log("+", user, profile);
    myEmail = profile.email;
    hasAi = !!profile.key;
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
        files: ["index.html", "style.css", "script.js"],
        selectedFile: "index.html",
        fileContents: {
          "index.html": `<canvas id="canvas" tabindex="0" style:"width:100%; height:100%; border:1px solid;"></canvas>`,
          "style.css":
            "html{ width:100%; height:100%; background-color: #333; color:  #f0f0f0; margin:0px; padding:0px; display:flex; flex-direction:column;} canvas { flex:1; margin:5px; }",
          "script.js": 'console.log("Hello, World!");',
        },
        preview: "",
      },
      null,
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
          files: ["index.html", "style.css", "script.js"],
          selectedFile: "index.html",
          fileContents: {
            "index.html": `<canvas id="canvas" tabindex="0" style:"width:100%; height:100%; border:1px solid;"></canvas>`,
            "style.css":
              "html{ width:100%; height:100%; background-color: #333; color:  #f0f0f0; margin:0px; padding:0px; display:flex; flex-direction:column;} canvas { flex:1; margin:5px; }",
            "script.js": 'console.log("Hello, World!");',
          },
          preview: "",
        },
        null,
      ];
    }
    const response = await fetch(`${"https://app.js2go.ru"}/${projectId}`);

    if (response.ok) {
      const { content, email, name = "" } = await response.json();
      return [
        {
          id: project.id,
          isMy: myEmail === email,
          hasAi,
          fileContents: content,
          projectId,
          email,
          name,
          error: "",
          lastPublish: "",
        },
        null,
      ];
    } else {
      console.error("Failed to load file contents:", response.statusText);
      return [null, "Failed to load file content"];
    }
  } catch (err) {
    console.error("Error loading file contents:", err);
    return [null, "Failed to load project"];
  }
}
