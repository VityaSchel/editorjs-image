import { IconPicture } from '@codexteam/icons';
import { make } from './utils/dom';
import type { API } from '@editorjs/editorjs';
import type { VideoConfig } from './types/types';

/**
 * Enumeration representing the different states of the UI.
 */
export enum UiState {
  /**
   * The UI is in an empty state, with no video loaded or being selected.
   */
  Empty = 'empty',

  /**
   * The UI is in an uploading state, indicating an video is currently being uploaded.
   */
  Uploading = 'uploading',

  /**
   * The UI is in a filled state, with an video successfully loaded.
   */
  Filled = 'filled'
};

/**
 * Nodes interface representing various elements in the UI.
 */
interface Nodes {
  /**
   * Wrapper element in the UI.
   */
  wrapper: HTMLElement;

  /**
   * Container for the video element in the UI.
   */
  videoContainer: HTMLElement;

  /**
   * Button for selecting files.
   */
  fileButton: HTMLElement;

  /**
   * Represents the video element in the UI, if one is present; otherwise, it's undefined.
   */
  videoEl?: HTMLElement;

  /**
   * Preloader element for the video.
   */
  videoPreloader: HTMLElement;

  /**
   * Caption element for the video.
   */
  caption: HTMLElement;
}

/**
 * ConstructorParams interface representing parameters for the Ui class constructor.
 */
interface ConstructorParams {
  /**
   * Editor.js API.
   */
  api: API;
  /**
   * Configuration for the video.
   */
  config: VideoConfig;
  /**
   * Callback function for selecting a file.
   */
  onSelectFile: () => void;
  /**
   * Flag indicating if the UI is in read-only mode.
   */
  readOnly: boolean;
}

/**
 * Class for working with UI:
 *  - rendering base structure
 *  - show/hide preview
 *  - apply tune view
 */
export default class Ui {
  /**
   * Nodes representing various elements in the UI.
   */
  public nodes: Nodes;

  /**
   * API instance for Editor.js.
   */
  private api: API;

  /**
   * Configuration for the video tool.
   */
  private config: VideoConfig;

  /**
   * Callback function for selecting a file.
   */
  private onSelectFile: () => void;

  /**
   * Flag indicating if the UI is in read-only mode.
   */
  private readOnly: boolean;

  /**
   * @param ui - video tool Ui module
   * @param ui.api - Editor.js API
   * @param ui.config - user config
   * @param ui.onSelectFile - callback for clicks on Select file button
   * @param ui.readOnly - read-only mode flag
   */
  constructor({ api, config, onSelectFile, readOnly }: ConstructorParams) {
    this.api = api;
    this.config = config;
    this.onSelectFile = onSelectFile;
    this.readOnly = readOnly;
    this.nodes = {
      wrapper: make('div', [this.CSS.baseClass, this.CSS.wrapper]),
      videoContainer: make('div', [this.CSS.videoContainer]),
      fileButton: this.createFileButton(),
      videoEl: undefined,
      videoPreloader: make('div', this.CSS.videoPreloader),
      caption: make('div', [this.CSS.input, this.CSS.caption], {
        contentEditable: !this.readOnly,
      }),
    };

    /**
     * Create base structure
     *  <wrapper>
     *    <video-container>
     *      <video-preloader />
     *    </video-container>
     *    <caption />
     *    <select-file-button />
     *  </wrapper>
     */
    this.nodes.caption.dataset.placeholder = this.config.captionPlaceholder;
    this.nodes.videoContainer.appendChild(this.nodes.videoPreloader);
    this.nodes.wrapper.appendChild(this.nodes.videoContainer);
    this.nodes.wrapper.appendChild(this.nodes.caption);
    this.nodes.wrapper.appendChild(this.nodes.fileButton);
  }

  /**
   * Apply visual representation of activated tune
   * @param tuneName - one of available tunes {@link Tunes.tunes}
   * @param status - true for enable, false for disable
   */
  public applyTune(tuneName: string, status: boolean): void {
    this.nodes.wrapper.classList.toggle(`${this.CSS.wrapper}--${tuneName}`, status);
  }

  /**
   * Renders tool UI
   */
  public render(): HTMLElement {
    this.toggleStatus(UiState.Empty);

    return this.nodes.wrapper;
  }

  /**
   * Shows uploading preloader
   */
  public showPreloader(): void {
    this.toggleStatus(UiState.Uploading);
  }

  /**
   * Hide uploading preloader
   */
  public hidePreloader(): void {
    this.toggleStatus(UiState.Empty);
  }

  /**
   * Shows an video
   * @param url - video source
   */
  public fillVideo(url: string): void {
    /**
     * Check for a source extension to compose element correctly: video tag for mp4, img — for others
     */
    const tag = /\.mp4$/.test(url) ? 'VIDEO' : 'IMG';

    const attributes: { [key: string]: string | boolean } = {
      src: url,
    };

    /**
     * We use eventName variable because IMG and VIDEO tags have different event to be called on source load
     * - IMG: load
     * - VIDEO: loadeddata
     */
    let eventName = 'load';

    /**
     * Update attributes and eventName if source is a mp4 video
     */
    if (tag === 'VIDEO') {
      /**
       * Add attributes for playing muted mp4 as a gif
       */
      attributes.playsinline = true;
      attributes.controls = true;

      /**
       * Change event to be listened
       */
      eventName = 'loadeddata';
    }

    /**
     * Compose tag with defined attributes
     */
    this.nodes.videoEl = make(tag, this.CSS.videoEl, attributes);

    /**
     * Add load event listener
     */
    this.nodes.videoEl.addEventListener(eventName, () => {
      this.toggleStatus(UiState.Filled);
    });

    this.nodes.videoContainer.appendChild(this.nodes.videoEl);
  }

  /**
   * Shows caption input
   * @param text - caption content text
   */
  public fillCaption(text: string): void {
    if (this.nodes.caption !== undefined) {
      this.nodes.caption.innerHTML = text;
    }
  }

  /**
   * Changes UI status
   * @param status - see {@link Ui.status} constants
   */
  public toggleStatus(status: UiState): void {
    for (const statusType in UiState) {
      if (Object.prototype.hasOwnProperty.call(UiState, statusType)) {
        const state = UiState[statusType as keyof typeof UiState];

        this.nodes.wrapper.classList.toggle(`${this.CSS.wrapper}--${state}`, state === status);
      }
    }
  }

  /**
   * CSS classes
   */
  private get CSS(): Record<string, string> {
    return {
      baseClass: this.api.styles.block,
      loading: this.api.styles.loader,
      input: this.api.styles.input,
      button: this.api.styles.button,

      /**
       * Tool's classes
       */
      wrapper: 'video-tool',
      videoContainer: 'video-tool__video',
      videoPreloader: 'video-tool__video-preloader',
      videoEl: 'video-tool__video-picture',
      caption: 'video-tool__caption',
    };
  };

  /**
   * Creates upload-file button
   */
  private createFileButton(): HTMLElement {
    const button = make('div', [this.CSS.button]);

    button.innerHTML = this.config.buttonContent ?? `${IconPicture} ${this.api.i18n.t('Select an Video')}`;

    button.addEventListener('click', () => {
      this.onSelectFile();
    });

    return button;
  }
}
