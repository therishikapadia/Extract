"use client";
import React, { useState, useEffect } from "react";
import { Sidebar, SidebarBody, SidebarLink } from "../ui/Sidebar";
import prof from "../assets/prof.svg";
import {
  IconBrandTabler,
  IconArrowLeft,
  IconMessage,
} from "@tabler/icons-react";
import { cn } from "../lib/utils";
import ChatApp from "../components/ChatApp";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export default function NutritionAnalysisPage() {
  const [open, setOpen] = useState(false);
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null); // Will hold { id, title, messages }
  const [loading, setLoading] = useState(true);

  // Fetch user chats
  useEffect(() => {
    const fetchChats = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/user-chats/`, {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });
        const data = await res.json();
        if (data.success) {
          setChats(data.chats);
        } else {
          console.error("Failed to load chats:", data.error);
        }
      } catch (err) {
        console.error("Error fetching chats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchChats();
  }, []);

  // Handle chat selection
  const handleChatClick = async (chat) => {
    try {
      const res = await fetch(`${API_BASE}/api/chat-history/${chat.id}/`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();
      if (data.success) {
        setSelectedChat({
          id: data.chat_id,
          title: data.title,
          created_at: data.created_at,
          messages: data.messages.map((msg) => ({
            ...msg,
            id: msg.id,
            role: msg.role,
            content: msg.content,
            image_url: msg.image_url,
            created_at: msg.timestamp, // normalize key
          })),
        });
      }
    } catch (err) {
      console.error("Failed to load chat history:", err);
    }
  };

  // Start a new chat
  const startNewChat = () => {
    setSelectedChat(null);
  };

  const links = [
    {
      label: "New Chat",
      href: "#",
      icon: (
        <IconBrandTabler className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
      action: startNewChat,
    },
    {
      label: "Logout",
      href: "#",
      icon: (
        <IconArrowLeft className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
  ];

  return (
    <div
      className={cn(
        "mx-auto flex w-full flex-1 flex-col overflow-hidden rounded-md border border-neutral-200 bg-gray-100 md:flex-row dark:border-neutral-700 dark:bg-neutral-800 h-screen p-0 m-0"
      )}
    >
      {/* Sidebar */}
      <Sidebar open={open} setOpen={setOpen} className="w-[300px]">
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
            {open ? <Logo /> : <LogoIcon />}

            {/* Action Links */}
            <div className="mt-8 px-2">
              {links.map((link, idx) => (
                <button
                  key={idx}
                  onClick={link.action}
                  className="w-full text-left"
                >
                  <SidebarLink link={link} />
                </button>
              ))}
            </div>

            {/* Chat List */}
            <div className="mt-6 flex flex-col gap-1 px-2">
              {loading ? (
                <p className="text-sm text-neutral-500 dark:text-neutral-400 px-2 py-1">
                  Loading...
                </p>
              ) : chats.length === 0 ? (
                <p className="text-sm text-neutral-500 dark:text-neutral-400 px-2 py-1">
                </p>
              ) : (
                chats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => handleChatClick(chat)}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-md text-left text-sm transition-colors hover:bg-gray-200 dark:hover:bg-neutral-700",
                      selectedChat?.id === chat.id
                        ? "bg-gray-200 dark:bg-neutral-700 font-medium"
                        : "text-neutral-700 dark:text-neutral-300"
                    )}
                  >
                    <IconMessage className="h-4 w-4" />
                    <span className="truncate">{chat.title}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* User Profile */}
          <div className="px-2">
            <SidebarLink
              link={{
                label: "Rishi Kapadia",
                href: "#",
                icon: (
                  <img
                    src={prof}
                    className="h-7 w-7 rounded-full"
                    alt="Avatar"
                  />
                ),
              }}
            />
          </div>
        </SidebarBody>
      </Sidebar>

      {/* Main Content */}
      <div className="flex flex-1">
        <div className="flex h-full w-full flex-1 flex-col rounded-tl-2xl bg-white p-4 md:p-8 dark:bg-neutral-900">
          <h1 className="text-2xl font-semibold mb-2 text-neutral-800 dark:text-neutral-100">
            NutriMind
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
            Upload a photo of ingredient list to get AI-powered insights.
          </p>
          <div className="flex-1">
            <ChatApp initialChat={selectedChat} onStartNew={startNewChat} />
          </div>
        </div>
      </div>
    </div>
  );
}

// === Logo Components ===
const Logo = () => (
  <a className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal text-black dark:text-white">
    <span className="font-bold text-xl"></span>
  </a>
);

const LogoIcon = () => (
  <a className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal text-black dark:text-white">
    <span className="font-bold"></span>
  </a>
);