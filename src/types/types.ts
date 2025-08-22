import type { HTMLPasteEventDetail } from '@editorjs/editorjs';

/**
 * Represents options for uploading, including a function to handle previewing.
 */
export interface UploadOptions {
  /**
   * Callback function to be called when the preview is ready.
   * @param src - The source of the preview as a string.
   * @returns void
   */
  onPreview: (src: string) => void;
}

/**
 * User configuration of Video block tunes. Allows to add custom tunes through the config
 */
export interface ActionConfig {
  /**
   * The name of the tune.
   */
  name: string;

  /**
   * The icon for the tune. Should be an SVG string.
   */
  icon: string;

  /**
   * The title of the tune. This will be displayed in the UI.
   */
  title: string;

  /**
   * An optional flag indicating whether the tune is a toggle (true) or not (false).
   */
  toggle?: boolean;

  /**
   * An optional action function to be executed when the tune is activated.
   */
  action?: Function;
};

/**
 * UploadResponseFormat interface representing the response format expected from the backend on file uploading.
 */
export interface UploadResponseFormat<AdditionalFileData = {}> {
  /**
   * success - 1 for successful uploading, 0 for failure
   */
  success: number;

  /**
   * Object with file data.
   *             'url' is required,
   *             also can contain any additional data that will be saved and passed back
   */
  file: {
    /**
     * The URL of the uploaded video.
     */
    url: string;
  } & AdditionalFileData;
}

/**
 * VideoToolData type representing the input and output data format for the video tool, including optional custome actions.
 */
export type VideoToolData<Actions = {}, AdditionalFileData = {}> = {
  /**
   * Caption for the video.
   */
  caption: string;

  /**
   * Object containing the URL of the video file.
   * Also can contain any additional data.
   */
  file: {
    /**
     * The URL of the video.
     */
    url: string;
  } & AdditionalFileData;
} & (Actions extends Record<string, boolean> ? Actions : {});

/**
 * @description Allows to enable or disable features.
 */
export type FeaturesConfig = {
  /**
   * Flag to enable/disable caption.
   * Can be set to 'optional' to allow users to toggle via block tunes.
   */
  caption?: boolean | 'optional';
};

/**
 *
 * @description Config supported by Tool
 */
export interface VideoConfig {
  /**
   * Endpoints for upload, whether using file or URL.
   */
  endpoints: {

    /**
     * Endpoint for file upload.
     */
    byFile?: string;

    /**
     * Endpoints for URL upload.
     */
    byUrl?: string;
  };

  /**
   * Field name for the uploaded video.
   */
  field?: string;

  /**
   * Allowed mime-types for the uploaded video.
   */
  types?: string;

  /**
   * Placeholder text for the caption field.
   */
  captionPlaceholder?: string;

  /**
   * Additional data to send with requests.
   */
  additionalRequestData?: object;

  /**
   * Additional headers to send with requests.
   */
  additionalRequestHeaders?: object;

  /**
   * Custom content for the select file button.
   */
  buttonContent?: string;

  /**
   * Optional custom uploader.
   */
  uploader?: {

    /**
     * Method to upload a video by file.
     */
    uploadByFile?: (file: Blob) => Promise<UploadResponseFormat>;

    /**
     * Method to upload a video by URL.
     */
    uploadByUrl?: (url: string) => Promise<UploadResponseFormat>;
  };

  /**
   * Additional actions for the tool.
   */
  actions?: ActionConfig[];

  /**
   * Tunes to be enabled.
   */
  features?: FeaturesConfig;
}

/**
 * Interface representing the details of a paste event for HTML elements.
 * Extends the `HTMLPasteEventDetail` interface to include additional data properties.
 */
export interface HTMLPasteEventDetailExtended extends HTMLPasteEventDetail {
  /**
   * The data property containing the source of the video and HTML element details.
   */
  data: {
    /**
     * The source URL of the pasted video.
     */
    src: string;
  } & HTMLElement;
}

/**
 * Parameter type of Video setter function in VideoTool
 */
export type VideoSetterParam = {
  /**
   * url path of the video
   */
  url: string;
};
