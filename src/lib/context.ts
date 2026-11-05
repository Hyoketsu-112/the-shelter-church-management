"use client";
import { getSavedChurchId, getSavedWorkspace } from "./workspace";
export const currentChurchId=()=>getSavedChurchId();
export const currentWorkspace=()=>getSavedWorkspace();
