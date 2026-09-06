import React, { useState, ChangeEvent } from "react";
import { Add24Regular, Delete24Regular } from "@fluentui/react-icons";
import { useMsal } from "@azure/msal-react";
import { useTranslation } from "react-i18next";

import { Button, Popover } from "@/components/ui";
import { cn } from "@/lib/utils";
import { SimpleAPIResponse, uploadFileApi, deleteUploadedFileApi, listUploadedFilesApi } from "../../api";
import { useLogin, getToken } from "../../authConfig";

interface Props {
    className?: string;
    disabled?: boolean;
}

export const UploadFile: React.FC<Props> = ({ className, disabled }: Props) => {
    // State variables to manage the component behavior
    const [isCalloutVisible, setIsCalloutVisible] = useState<boolean>(false);
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [deletionStatus, setDeletionStatus] = useState<{ [filename: string]: "pending" | "error" | "success" }>({});
    const [uploadedFile, setUploadedFile] = useState<SimpleAPIResponse>();
    const [uploadedFileError, setUploadedFileError] = useState<string>();
    const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
    const { t } = useTranslation();

    if (!useLogin) {
        throw new Error("The UploadFile component requires useLogin to be true");
    }

    const client = useMsal().instance;

    // Handler for the "Manage file uploads" button
    const handleButtonClick = async () => {
        setIsCalloutVisible(!isCalloutVisible); // Toggle the Callout visibility

        // Update uploaded files by calling the API
        try {
            const idToken = await getToken(client);
            if (!idToken) {
                throw new Error("No authentication token available");
            }
            listUploadedFiles(idToken);
        } catch (error) {
            console.error(error);
            setIsLoading(false);
        }
    };

    const listUploadedFiles = async (idToken: string) => {
        listUploadedFilesApi(idToken).then(files => {
            setIsLoading(false);
            setDeletionStatus({});
            setUploadedFiles(files);
        });
    };

    const handleRemoveFile = async (filename: string) => {
        setDeletionStatus({ ...deletionStatus, [filename]: "pending" });

        try {
            const idToken = await getToken(client);
            if (!idToken) {
                throw new Error("No authentication token available");
            }

            await deleteUploadedFileApi(filename, idToken);
            setDeletionStatus({ ...deletionStatus, [filename]: "success" });
            listUploadedFiles(idToken);
        } catch (error) {
            setDeletionStatus({ ...deletionStatus, [filename]: "error" });
            console.error(error);
        }
    };

    // Handler for the form submission (file upload)
    const handleUploadFile = async (e: ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (!e.target.files || e.target.files.length === 0) {
            return;
        }
        setIsUploading(true); // Start the loading state
        const file: File = e.target.files[0];
        const formData = new FormData();
        formData.append("file", file);

        try {
            const idToken = await getToken(client);
            if (!idToken) {
                throw new Error("No authentication token available");
            }
            const response: SimpleAPIResponse = await uploadFileApi(formData, idToken);
            setUploadedFile(response);
            setIsUploading(false);
            setUploadedFileError(undefined);
            listUploadedFiles(idToken);
        } catch (error) {
            console.error(error);
            setIsUploading(false);
            setUploadedFileError(t("upload.uploadedFileError"));
        }
    };

    return (
        <div className={cn("flex items-center gap-1.5", className)}>
            <Popover
                open={isCalloutVisible}
                onOpenChange={setIsCalloutVisible}
                maxWidth={360}
                trigger={
                    <Button variant="ghost" size="sm" disabled={disabled} onClick={handleButtonClick}>
                        <span className="inline-flex items-center gap-1.5">
                            <Add24Regular className="h-4 w-4" /> {t("upload.manageFileUploads")}
                        </span>
                    </Button>
                }
            >
                <form encType="multipart/form-data">
                    <div>
                        <label className="mb-1 block text-sm text-ink-2">{t("upload.fileLabel")}</label>
                        <input
                            accept=".txt, .md, .json, .png, .jpg, .jpeg, .bmp, .heic, .tiff, .pdf, .docx, .xlsx, .pptx, .html"
                            className="text-sm text-ink-2"
                            type="file"
                            onChange={handleUploadFile}
                        />
                    </div>
                </form>

                {/* Show a loading message while files are being uploaded */}
                {isUploading && <p className="text-sm text-ink-2">{t("upload.uploadingFiles")}</p>}
                {!isUploading && uploadedFileError && <p className="text-sm text-danger">{uploadedFileError}</p>}
                {!isUploading && uploadedFile && <p className="text-sm text-ink-2">{uploadedFile.message}</p>}

                {/* Display the list of already uploaded */}
                <h3 className="mb-2 mt-3 font-serif text-sm font-bold text-ink-1">{t("upload.uploadedFilesLabel")}</h3>

                {isLoading && <p className="text-sm text-ink-2">{t("upload.loading")}</p>}
                {!isLoading && uploadedFiles.length === 0 && <p className="text-sm text-ink-2">{t("upload.noFilesUploaded")}</p>}
                {uploadedFiles.map((filename, index) => {
                    return (
                        <div key={index} className="flex items-center justify-between gap-2 py-1">
                            <div className="max-w-[15.625em] truncate text-sm text-ink-1">{filename}</div>
                            {/* Button to remove a file from the list */}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveFile(filename)}
                                disabled={deletionStatus[filename] === "pending" || deletionStatus[filename] === "success"}
                            >
                                <span className="inline-flex items-center gap-1.5">
                                    <Delete24Regular className="h-4 w-4" />
                                    {!deletionStatus[filename] && t("upload.deleteFile")}
                                    {deletionStatus[filename] == "pending" && t("upload.deletingFile")}
                                    {deletionStatus[filename] == "error" && t("upload.errorDeleting")}
                                    {deletionStatus[filename] == "success" && t("upload.fileDeleted")}
                                </span>
                            </Button>
                        </div>
                    );
                })}
            </Popover>
        </div>
    );
};
