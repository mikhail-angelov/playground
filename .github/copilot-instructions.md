# GitHub Copilot Instructions

This document provides guidelines for using GitHub Copilot effectively in the `playground` project.

# Best Practices for React, Tailwind CSS, and Zustand

## Application Structure

### Project Organization
```
src/
├── components/          # Feature-specific components
│   └─── ui/              # Reusable UI components
├── pages/               # pages
├── stores/              # Zustand state management
├── utils/               # Utility functions and helpers
├── lib/                 # Global UI utils
└── assets/              # Static assets like images, fonts
```

## Component Creation Guidelines

### When to Create a New Component
- Create a new component when:
  - UI element will be reused in multiple places
  - A section of UI exceeds 100 lines of code
  - A section has its own distinct responsibility or purpose
  - Logic for a section becomes complex (more than 3 state variables or hooks)
  - Component has a specific interaction pattern (dropdown, modal, etc.)

### When NOT to Create a New Component
- Avoid creating components that are:
  - Used only once and very simple (under 50 lines)
  - Too granular (e.g., a single styled button with no special behavior)
  - Breaking a component only for the sake of smaller files

### Component Types
  
- **React Components** (`.jsx`/`.tsx`): Use for:
  - Interactive UI elements
  - Components that need to maintain state
  - Sections requiring event handlers and user interactions

## Zustand Best Practices

### Store Organization
- Create a separate store file for each domain/feature
- Export actions and getters, not the raw store
- Group related stores in directories by feature

### Keep Stores Simple
- Focus each store on a single responsibility
- Use atomic stores for primitive values when possible
- Use `map` stores for related data structures
- Create computed values with `computed` for derived state
- Separate UI state from domain data

### Store Actions Pattern
```javascript
// userStore.js
import { create } from "zustand";
import { toast } from "sonner"; // Import the toast function

interface Project {
  projectId: string;
  name: string;
  image: string;
}

interface ProjectsState {
  projects: Project[];
  loadProjects: (my?: boolean) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  isLoading: boolean;
  my?: boolean;
}

export const useProjectsStore = create<ProjectsState>((set, get) => ({
  projects: [],
  isLoading: false,
  my: false,
  loadProjects: async (my?: boolean) => {
    try {
      set({ isLoading: true,my: !!my });
      const response = await fetch(
        my ? "/api/project/my" : "/api/project/best"
      );
      if (response.ok) {
        const projects = await response.json();
        set({ projects });
      } else {
        console.error("Failed to load projects:", response.statusText);
        toast.error(`Failed to load projects: ${response.statusText}`); // Show error toast
      }
    } catch (err) {
      console.error("Error loading projects:", err);
      toast.error("Error loading projects"); // Show error toast
    }
    set({ isLoading: false });
  },
}));
```

## Markup and Tailwind CSS Guidelines

### Keep Markup Simple
- Aim for a maximum nesting depth of 3-4 levels
- Avoid excessive conditional rendering that creates multiple levels of nesting
- Use sensible defaults for CSS with minimal override complexity

### Tailwind Best Practices
- Use Tailwind's utility classes directly in HTML/JSX for most styling
- Extract reusable patterns to components rather than creating custom classes
- For complex components, consider grouping Tailwind classes with template literals
- Utilize Tailwind's `@apply` directive sparingly and only for highly reused patterns
- Create consistent spacing, color and typography systems through Tailwind configuration

### Component Composition Example
```jsx
// Bad: Overly nested and complex
<div className="p-4 border rounded-lg shadow-md">
  <div className="flex flex-col space-y-4">
    <div className="bg-gray-100 p-3 rounded">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">{title}</h3>
        {isEditable && (
          <div className="flex space-x-2">
            <button className="px-2 py-1 bg-blue-500 text-white rounded">Edit</button>
            <button className="px-2 py-1 bg-red-500 text-white rounded">Delete</button>
          </div>
        )}
      </div>
    </div>
  </div>
</div>

// Good: Flatter, component-based approach
<Card>
  <CardHeader>
    <h3 className="text-lg font-bold">{title}</h3>
    {isEditable && <ActionButtons actions={['edit', 'delete']} />}
  </CardHeader>
</Card>
```

## React Integration

### React with Zustand
- Use `@Zustand/react` for React components to access stores
- Import `useStore` hook to subscribe components to store changes
- Keep React components focused on UI rendering
- Move business logic and data fetching to store actions

```jsx
// React component with Zustand
import { useProjectsStore } from "../../stores/useProjectsStore";

export const ProjectList: React.FC = () => {
  const projects = useProjectsStore((state) => state.projects);
  
  return (
    // Component JSX
  );
}
```

## Code Elegance Guidelines

### Simplicity Principles
- Functions should generally be under 20 lines
- Components should generally be under 150 lines
- Aim for component props to be under 7 items
- Use destructuring for cleaner component interfaces
- Group related state items in meaningful objects
- Follow the principle of least knowledge (components only know what they need)

### Code Organization
- Default export for the main component in a file
- Named exports for utility functions
- Group related hooks at the top of a component
- Keep event handlers inside the component, but separate from the JSX

## Troubleshooting
- If Copilot's suggestions are irrelevant or incorrect:
  - Rephrase your prompt.
  - Provide more context or examples in your code.
  - Manually implement the required changes and use Copilot for refinement.

## Example Prompts
- "Add a new script to `package.json` for running database migrations."
- "Refactor this function to improve readability and performance."
- "Generate a TypeScript interface for the following JSON structure."
- "Create a utility function for formatting dates in `src/utils/date.ts`."
