import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";

const mockSignIn = vi.mocked(signInAction);
const mockSignUp = vi.mocked(signUpAction);
const mockGetAnonWorkData = vi.mocked(getAnonWorkData);
const mockClearAnonWork = vi.mocked(clearAnonWork);
const mockGetProjects = vi.mocked(getProjects);
const mockCreateProject = vi.mocked(createProject);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAnonWorkData.mockReturnValue(null);
  mockGetProjects.mockResolvedValue([]);
  mockCreateProject.mockResolvedValue({ id: "new-project-id" } as any);
});

describe("useAuth — initial state", () => {
  it("starts with isLoading false", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoading).toBe(false);
  });

  it("exposes signIn and signUp functions", () => {
    const { result } = renderHook(() => useAuth());
    expect(typeof result.current.signIn).toBe("function");
    expect(typeof result.current.signUp).toBe("function");
  });
});

describe("useAuth — signIn", () => {
  it("returns the result from signInAction on success", async () => {
    mockSignIn.mockResolvedValue({ success: true });
    mockGetProjects.mockResolvedValue([{ id: "proj-1" } as any]);

    const { result } = renderHook(() => useAuth());
    let returnValue: any;
    await act(async () => {
      returnValue = await result.current.signIn("user@example.com", "password123");
    });

    expect(returnValue).toEqual({ success: true });
  });

  it("returns the result from signInAction on failure", async () => {
    mockSignIn.mockResolvedValue({ success: false, error: "Invalid credentials" });

    const { result } = renderHook(() => useAuth());
    let returnValue: any;
    await act(async () => {
      returnValue = await result.current.signIn("user@example.com", "wrong");
    });

    expect(returnValue).toEqual({ success: false, error: "Invalid credentials" });
  });

  it("sets isLoading true during sign-in and resets to false after", async () => {
    let resolveSignIn!: (v: any) => void;
    mockSignIn.mockReturnValue(new Promise((r) => (resolveSignIn = r)));
    mockGetProjects.mockResolvedValue([]);
    mockCreateProject.mockResolvedValue({ id: "x" } as any);

    const { result } = renderHook(() => useAuth());

    let pending: Promise<any>;
    act(() => {
      pending = result.current.signIn("a@b.com", "pass");
    });
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveSignIn({ success: true });
      await pending;
    });
    expect(result.current.isLoading).toBe(false);
  });

  it("resets isLoading to false even when signInAction throws", async () => {
    mockSignIn.mockRejectedValue(new Error("network error"));

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("a@b.com", "pass").catch(() => {});
    });

    expect(result.current.isLoading).toBe(false);
  });

  it("does not call handlePostSignIn when sign-in fails", async () => {
    mockSignIn.mockResolvedValue({ success: false, error: "Invalid credentials" });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("a@b.com", "pass");
    });

    expect(mockGetAnonWorkData).not.toHaveBeenCalled();
    expect(mockGetProjects).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("calls signInAction with the provided credentials", async () => {
    mockSignIn.mockResolvedValue({ success: false });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("test@example.com", "mypassword");
    });

    expect(mockSignIn).toHaveBeenCalledWith("test@example.com", "mypassword");
  });
});

describe("useAuth — signUp", () => {
  it("returns the result from signUpAction on success", async () => {
    mockSignUp.mockResolvedValue({ success: true });
    mockGetProjects.mockResolvedValue([{ id: "proj-2" } as any]);

    const { result } = renderHook(() => useAuth());
    let returnValue: any;
    await act(async () => {
      returnValue = await result.current.signUp("new@example.com", "password123");
    });

    expect(returnValue).toEqual({ success: true });
  });

  it("returns failure result without navigating", async () => {
    mockSignUp.mockResolvedValue({ success: false, error: "Email already registered" });

    const { result } = renderHook(() => useAuth());
    let returnValue: any;
    await act(async () => {
      returnValue = await result.current.signUp("existing@example.com", "pass");
    });

    expect(returnValue).toEqual({ success: false, error: "Email already registered" });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("resets isLoading to false even when signUpAction throws", async () => {
    mockSignUp.mockRejectedValue(new Error("server error"));

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signUp("a@b.com", "pass").catch(() => {});
    });

    expect(result.current.isLoading).toBe(false);
  });
});

describe("useAuth — handlePostSignIn: anon work present", () => {
  it("creates a project from anon work and redirects to it", async () => {
    const anonWork = {
      messages: [{ role: "user", content: "hello" }],
      fileSystemData: { "/App.jsx": "export default () => <div/>" },
    };
    mockSignIn.mockResolvedValue({ success: true });
    mockGetAnonWorkData.mockReturnValue(anonWork);
    mockCreateProject.mockResolvedValue({ id: "anon-project" } as any);

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("a@b.com", "pass");
    });

    expect(mockCreateProject).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: anonWork.messages,
        data: anonWork.fileSystemData,
      })
    );
    expect(mockClearAnonWork).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/anon-project");
    expect(mockGetProjects).not.toHaveBeenCalled();
  });

  it("does not use anon work when messages array is empty", async () => {
    mockSignIn.mockResolvedValue({ success: true });
    mockGetAnonWorkData.mockReturnValue({ messages: [], fileSystemData: {} });
    mockGetProjects.mockResolvedValue([{ id: "existing-proj" } as any]);

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("a@b.com", "pass");
    });

    expect(mockCreateProject).not.toHaveBeenCalled();
    expect(mockClearAnonWork).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/existing-proj");
  });
});

describe("useAuth — handlePostSignIn: no anon work", () => {
  it("redirects to most recent project when projects exist", async () => {
    mockSignIn.mockResolvedValue({ success: true });
    mockGetProjects.mockResolvedValue([
      { id: "recent-proj" } as any,
      { id: "older-proj" } as any,
    ]);

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("a@b.com", "pass");
    });

    expect(mockPush).toHaveBeenCalledWith("/recent-proj");
    expect(mockCreateProject).not.toHaveBeenCalled();
  });

  it("creates a new project and redirects when no projects exist", async () => {
    mockSignIn.mockResolvedValue({ success: true });
    mockGetProjects.mockResolvedValue([]);
    mockCreateProject.mockResolvedValue({ id: "brand-new" } as any);

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("a@b.com", "pass");
    });

    expect(mockCreateProject).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [],
        data: {},
      })
    );
    expect(mockPush).toHaveBeenCalledWith("/brand-new");
  });

  it("new project name starts with 'New Design'", async () => {
    mockSignIn.mockResolvedValue({ success: true });
    mockGetProjects.mockResolvedValue([]);
    mockCreateProject.mockResolvedValue({ id: "x" } as any);

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("a@b.com", "pass");
    });

    const callArg = mockCreateProject.mock.calls[0][0];
    expect(callArg.name).toMatch(/^New Design #\d+$/);
  });
});
