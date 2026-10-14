import React, { useState, useEffect } from "react";
import { Code, Terminal, CheckCircle2, Play, FileCode, Folder, RefreshCw } from "lucide-react";

interface PythonModule {
  filename: string;
  directory: string;
  content: string;
  size: number;
}

export const CodebaseExplorer: React.FC = () => {
  const [modules, setModules] = useState<PythonModule[]>([]);
  const [selectedFile, setSelectedFile] = useState<PythonModule | null>(null);
  const [testOutput, setTestOutput] = useState<string>("");
  const [isRunningTests, setIsRunningTests] = useState<boolean>(false);

  useEffect(() => {
    fetch("/api/python-modules")
      .then((res) => res.json())
      .then((data) => {
        if (data.modules && data.modules.length > 0) {
          setModules(data.modules);
          // Default to detector.py
          const det = data.modules.find((m: PythonModule) => m.filename === "detector.py") || data.modules[0];
          setSelectedFile(det);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const handleRunTests = async () => {
    setIsRunningTests(true);
    setTestOutput("Running automated Python test suite (main.py --mode test)...\n");
    try {
      const res = await fetch("/api/run-tests", { method: "POST" });
      const data = await res.json();
      setTestOutput(data.stdout + (data.stderr ? "\nSTDERR:\n" + data.stderr : ""));
    } catch (e: any) {
      setTestOutput("Test execution error: " + e.message);
    } finally {
      setIsRunningTests(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col h-[520px] shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Code className="w-5 h-5 text-emerald-400" />
          <div>
            <h3 className="text-sm font-semibold text-slate-100">
              PYTHON ENGINE ARCHITECTURE & CODEBASE
            </h3>
            <span className="text-[10px] font-mono text-slate-400">
              Target Windows Repo: C:\Users\USER\Desktop\matchvision AI
            </span>
          </div>
        </div>

        <button
          onClick={handleRunTests}
          disabled={isRunningTests}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
        >
          {isRunningTests ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          Run Verification Tests
        </button>
      </div>

      <div className="grid grid-cols-12 gap-3 mt-3 flex-1 min-h-0">
        {/* File Tree */}
        <div className="col-span-3 bg-slate-950/80 rounded-lg border border-slate-800/80 p-2 overflow-y-auto text-xs space-y-1">
          <div className="text-[10px] uppercase font-mono text-slate-500 px-2 py-1 font-semibold flex items-center gap-1">
            <Folder className="w-3 h-3 text-cyan-400" /> Repository Files
          </div>
          {modules.map((m) => {
            const isSel = selectedFile?.filename === m.filename && selectedFile?.directory === m.directory;
            return (
              <button
                key={`${m.directory}/${m.filename}`}
                onClick={() => setSelectedFile(m)}
                className={`w-full text-left px-2 py-1.5 rounded-md flex items-center gap-2 transition-colors ${
                  isSel
                    ? "bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                }`}
              >
                <FileCode className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                <span className="truncate font-mono text-[11px]">
                  {m.directory !== "root" ? `${m.directory}/` : ""}
                  {m.filename}
                </span>
              </button>
            );
          })}
        </div>

        {/* Code Content & Terminal Output */}
        <div className="col-span-9 flex flex-col min-h-0 gap-2">
          {/* Code Viewer */}
          <div className="flex-1 bg-slate-950 rounded-lg border border-slate-800 p-3 overflow-y-auto font-mono text-[11px] text-slate-300 scrollbar-thin scrollbar-thumb-slate-800">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80 text-[10px] text-slate-400">
              <span>{selectedFile ? `${selectedFile.directory}/${selectedFile.filename}` : "Select file"}</span>
              <span>Python 3.10+ Compatible</span>
            </div>
            <pre className="whitespace-pre-wrap">{selectedFile?.content || "Loading file..."}</pre>
          </div>

          {/* Test Runner Output Terminal */}
          {testOutput && (
            <div className="h-32 bg-slate-950 border border-slate-800 rounded-lg p-2.5 font-mono text-[11px] overflow-y-auto text-emerald-400">
              <div className="flex items-center gap-1.5 text-slate-500 text-[10px] pb-1 border-b border-slate-800 mb-1">
                <Terminal className="w-3 h-3" /> Test Runner Output (pytest)
              </div>
              <pre className="whitespace-pre-wrap">{testOutput}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
