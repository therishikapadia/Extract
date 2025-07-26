import { cn } from "../lib/utils";
import React, { useRef, useState } from "react";
import { motion } from "motion/react";
import { IconUpload } from "@tabler/icons-react";
import { useDropzone } from "react-dropzone";
import Button from "./Button";
import { Dialog } from "@headlessui/react";
import AuthForm from "./AuthForm";
import { useNavigate } from "react-router-dom";
const mainVariant = {
  initial: {
    x: 0,
    y: 0,
  },
  animate: {
    x: 20,
    y: -20,
    opacity: 0.9,
  },
};

const secondaryVariant = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
  },
};

export const FileUpload = ({
  onChange,
}: {
  onChange?: (files: File[]) => void;
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [response, setResponse] = useState<string | null>(null); // Add state for LLM response
  const [button,setButton] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem("theme");
    if (stored) return stored;
    return window.matchMedia("(prefers-color-scheme:dark)").matches ? "dark" : "light";
  });
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  // Function to send file to /analyze endpoint
  const analyzeFile = async (file: File) => {
    setIsLoading(true);
    const formData = new FormData();
    formData.append("image", file); // <-- Fix: use "image" as the key

    try {
      const res = await fetch(`${API_BASE_URL}/analyze/`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to analyze file");
      }
      const data = await res.json();
      setResponse(data.summary || JSON.stringify(data)); // Show summary or all data
      console.log(data);
      setButton(true);
      sessionStorage.setItem("analysisResult", data.summary || JSON.stringify(data));
      sessionStorage.setItem("analysisFull", JSON.stringify(data));
      if (data.analysis_id) sessionStorage.setItem("analysisId", data.analysis_id);
    } catch (err: any) {
      setResponse("Error analyzing file: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (newFiles: File[]) => {
    setFiles((prevFiles) => [...prevFiles, ...newFiles]);
    onChange && onChange(newFiles);
    if (newFiles.length > 0) {
      analyzeFile(newFiles[0]); // Only send the first file (since multiple: false)
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleUploadAreaClick = (e: React.MouseEvent) => {
    // Only trigger file input if not clicking on a button or inside the modal
    if (isAuthOpen) return;
    // Prevent file input if clicking on a button
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    fileInputRef.current?.click();
  };

  const handleAuthSuccess = () => {
    // Store file in sessionStorage for ChatApp to retrieve
    if (files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = function (e) {
        sessionStorage.setItem("uploadedFile", e.target?.result as string);
        navigate("/chat");
      };
      reader.readAsDataURL(file);
    } else {
      navigate("/chat");
    }
    setIsAuthOpen(false);
  };

  const { getRootProps, isDragActive } = useDropzone({
    multiple: false,
    noClick: true,
    onDrop: handleFileChange,
    onDropRejected: (error) => {
      console.log(error);
    },
  });

  return (
    <div className="w-full" {...getRootProps()}>
      <motion.div
        onClick={handleUploadAreaClick}
        whileHover="animate"
        className="p-10 group/file block rounded-lg cursor-pointer w-full relative overflow-hidden"
      >
        <input
          ref={fileInputRef}
          id="file-upload-handle"
          type="file"
          onChange={(e) => handleFileChange(Array.from(e.target.files || []))}
          className="hidden"
        />
        <div className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,white,transparent)]">
          <GridPattern />
        </div>
        <div className="flex flex-col items-center justify-center">
          <p className="relative z-20 font-sans font-bold text-neutral-700 dark:text-neutral-300 text-base">
            Upload Ingredients Image
          </p>
          <p className="relative z-20 font-sans font-normal text-neutral-400 dark:text-neutral-400 text-base mt-2">
            Drag or drop your image here or click to upload
          </p>
          <div className="relative w-full mt-10 max-w-xl mx-auto">
            {files.length > 0 &&
              files.map((file, idx) => (
                <motion.div
                  key={"file" + idx}
                  layoutId={idx === 0 ? "file-upload" : "file-upload-" + idx}
                  className={cn(
                    "relative overflow-hidden z-40 bg-white dark:bg-neutral-900 flex flex-col items-start justify-start md:h-24 p-4 mt-4 w-full mx-auto rounded-md",
                    "shadow-sm"
                  )}
                >
                  <div className="flex justify-between w-full items-center gap-4">
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      layout
                      className="text-base text-neutral-700 dark:text-neutral-300 truncate max-w-xs"
                    >
                      {file.name}
                    </motion.p>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      layout
                      className="rounded-lg px-2 py-1 w-fit shrink-0 text-sm text-neutral-600 dark:bg-neutral-800 dark:text-white shadow-input"
                    >
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </motion.p>
                  </div>

                  {/* SUN element */}
                  <div className="flex text-sm md:flex-row flex-col items-start md:items-center w-full mt-2 justify-between text-neutral-600 dark:text-neutral-400">
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      layout
                      className="px-1 py-0.5 rounded-md bg-gray-100 dark:bg-neutral-800 "
                    >
                      {file.type}
                    </motion.p>

                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      layout
                    >
                      modified{" "}
                      {new Date(file.lastModified).toLocaleDateString()}
                    </motion.p>
                  </div>
                </motion.div>
              ))}
            {!files.length && (
              <motion.div
                layoutId="file-upload"
                variants={mainVariant}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 20,
                }}
                className={cn(
                  "relative group-hover/file:shadow-2xl z-40 bg-white dark:bg-neutral-900 flex items-center justify-center h-32 mt-4 w-full max-w-[8rem] mx-auto rounded-md",
                  "shadow-[0px_10px_50px_rgba(0,0,0,0.1)]"
                )}
              >
                {isDragActive ? (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-neutral-600 flex flex-col items-center"
                  >
                    Drop it
                    <IconUpload className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                  </motion.p>
                ) : (
                  <IconUpload className="h-4 w-4 text-neutral-600 dark:text-neutral-300" />
                )}
              </motion.div>
            )}

            {!files.length && (
              <motion.div
                variants={secondaryVariant}
                className="absolute opacity-0 border border-dashed border-sky-400 inset-0 z-30 bg-transparent flex items-center justify-center h-32 mt-4 w-full max-w-[8rem] mx-auto rounded-md"
              ></motion.div>
            )}
          </div>
          {isLoading && !response && (
            <div className="mt-6 p-4 z-20 rounded bg-gray-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-300 w-full  mx-auto">
              <div className="h-6 w-1/2 bg-gray-200 dark:bg-neutral-800 rounded mb-4 animate-pulse" />
              <div className="h-4 w-full bg-gray-200 dark:bg-neutral-800 rounded mb-2 animate-pulse" />
              <div className="h-4 w-2/3 bg-gray-200 dark:bg-neutral-800 rounded mb-2 animate-pulse" />
              <div className="h-4 w-1/3 bg-gray-200 dark:bg-neutral-800 rounded animate-pulse" />
              <div className="mt-4 text-neutral-400">Analyzing label...</div>
            </div>
          )}
          {response && !isLoading && (
            <>
              <div className="mt-6 p-4 z-20 rounded bg-gray-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-300 w-full mx-auto">
                <strong>Analysis Result:</strong>
                {/* console.log(response) */}
                <pre className="whitespace-pre-wrap break-words">{response}</pre>
              </div>
              <Button className="mt-4 z-20" onClick={() => setIsAuthOpen(true)}>
                Login to continue
              </Button>
              <Dialog open={isAuthOpen} onClose={() => setIsAuthOpen(false)} className="fixed z-50 inset-0 overflow-y-auto">
                <div className="flex items-center justify-center min-h-screen px-4">
                  <div className="fixed inset-0 bg-black opacity-30" aria-hidden="true" />
                  <div className="relative bg-white dark:bg-neutral-900 rounded-xl shadow-xl p-6 w-full max-w-md z-50">
                    <AuthForm theme={theme} setTheme={setTheme} onAuthSuccess={handleAuthSuccess} />
                    <button className="absolute top-2 right-2 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200" onClick={() => setIsAuthOpen(false)}>&times;</button>
                  </div>
                </div>
              </Dialog>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export function GridPattern() {
  const columns = 41;
  const rows = 11;
  return (
    <div className="flex bg-gray-100 dark:bg-neutral-900 shrink-0 flex-wrap justify-center items-center gap-x-px gap-y-px  scale-105">
      {Array.from({ length: rows }).map((_, row) =>
        Array.from({ length: columns }).map((_, col) => {
          const index = row * columns + col;
          return (
            <div
              key={`${col}-${row}`}
              className={`w-10 h-10 flex shrink-0 rounded-[2px] ${
                index % 2 === 0
                  ? "bg-gray-50 dark:bg-neutral-950"
                  : "bg-gray-50 dark:bg-neutral-950 shadow-[0px_0px_1px_3px_rgba(255,255,255,1)_inset] dark:shadow-[0px_0px_1px_3px_rgba(0,0,0,1)_inset]"
              }`}
            />
          );
        })
      )}
    </div>
  );
}

export default FileUpload;