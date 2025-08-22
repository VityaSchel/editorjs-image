/**
 * Video Tool for the Editor.js
 * @author Viktor Shchelochkov <hi@hloth.dev> (https://hloth.dev)
 * @license MIT
 * @see {@link https://github.com/VityaSchel/editorjs-image/tree/editorjs-video}
 *
 * To developers.
 * To simplify Tool structure, we split it to 4 parts:
 *  1) index.ts — main Tool's interface, public API and methods for working with data
 *  2) uploader.ts — module that has methods for sending files via AJAX: from device, by URL or File pasting
 *  3) ui.ts — module for UI manipulations: render, showing preloader, etc
 *
 * For debug purposes there is a testing server
 * that can save uploaded files and return a Response {@link UploadResponseFormat}
 *
 *       $ node dev/server.js
 *
 * It will expose 8008 port, so you can pass http://localhost:8008 with the Tools config:
 *
 * video: {
 *   class: VideoTool,
 *   config: {
 *     endpoints: {
 *       byFile: 'http://localhost:8008/uploadFile',
 *       byUrl: 'http://localhost:8008/fetchUrl',
 *     }
 *   },
 * },
 */

import type { TunesMenuConfig } from '@editorjs/editorjs/types/tools';
import type { API, ToolboxConfig, PasteConfig, BlockToolConstructorOptions, BlockTool, BlockAPI, PasteEvent, PatternPasteEventDetail, FilePasteEventDetail } from '@editorjs/editorjs';
import './index.css';

import Ui from './ui';
import Uploader from './uploader';

import { IconPlay, IconText } from '@codexteam/icons';
import type { ActionConfig, UploadResponseFormat, VideoToolData, VideoConfig, HTMLPasteEventDetailExtended, VideoSetterParam, FeaturesConfig } from './types/types';

type VideoToolConstructorOptions = BlockToolConstructorOptions<VideoToolData, VideoConfig>;

/**
 * Implementation of VideoTool class
 */
export default class VideoTool implements BlockTool {
  /**
   * Editor.js API instance
   */
  private api: API;

  /**
   * Current Block API instance
   */
  private block: BlockAPI;

  /**
   * Configuration for the VideoTool
   */
  private config: VideoConfig;

  /**
   * Uploader module instance
   */
  private uploader: Uploader;

  /**
   * UI module instance
   */
  private ui: Ui;

  /**
   * Stores current block data internally
   */
  private _data: VideoToolData;

  /**
   * Caption enabled state
   * Null when user has not toggled the caption tune
   * True when user has toggled the caption tune
   * False when user has toggled the caption tune
   */
  private isCaptionEnabled: boolean | null = null;

  /**
   * @param tool - tool properties got from editor.js
   * @param tool.data - previously saved data
   * @param tool.config - user config for Tool
   * @param tool.api - Editor.js API
   * @param tool.readOnly - read-only mode flag
   * @param tool.block - current Block API
   */
  constructor({ data, config, api, readOnly, block }: VideoToolConstructorOptions) {
    this.api = api;
    this.block = block;

    /**
     * Tool's initial config
     */
    this.config = {
      endpoints: config.endpoints,
      additionalRequestData: config.additionalRequestData,
      additionalRequestHeaders: config.additionalRequestHeaders,
      field: config.field,
      types: config.types,
      captionPlaceholder: this.api.i18n.t(config.captionPlaceholder ?? 'Caption'),
      buttonContent: config.buttonContent,
      uploader: config.uploader,
      actions: config.actions,
      features: config.features || {},
    };

    /**
     * Module for file uploading
     */
    this.uploader = new Uploader({
      config: this.config,
      onUpload: (response: UploadResponseFormat) => this.onUpload(response),
      onError: (error: string) => this.uploadingFailed(error),
    });

    /**
     * Module for working with UI
     */
    this.ui = new Ui({
      api,
      config: this.config,
      onSelectFile: () => {
        this.uploader.uploadSelectedFile({
          onPreview: () => {
            this.ui.showPreloader();
          },
        });
      },
      readOnly,
    });

    /**
     * Set saved state
     */
    this._data = {
      caption: '',
      aspectRatio: 1,
      file: {
        url: '',
      },
    };
    this.data = data;
  }

  /**
   * Notify core that read-only mode is supported
   */
  public static get isReadOnlySupported(): boolean {
    return true;
  }

  /**
   * Get Tool toolbox settings
   * icon - Tool icon's SVG
   * title - title to show in toolbox
   */
  public static get toolbox(): ToolboxConfig {
    return {
      icon: IconPlay,
      title: 'Video',
    };
  }

  /**
   * Available video tools
   */
  public static get tunes(): Array<ActionConfig> {
    return [];
  }

  /**
   * Renders Block content
   */
  public render(): HTMLDivElement {
    if (this.config.features?.caption === true || this.config.features?.caption === undefined || (this.config.features?.caption === 'optional' && this.data.caption)) {
      this.isCaptionEnabled = true;
      this.ui.applyTune('caption', true);
    }

    return this.ui.render() as HTMLDivElement;
  }

  /**
   * Validate data: check if Video exists
   * @param savedData — data received after saving
   * @returns false if saved data is not correct, otherwise true
   */
  public validate(savedData: VideoToolData): boolean {
    return !!savedData.file.url;
  }

  /**
   * Return Block data
   */
  public save(): VideoToolData {
    const caption = this.ui.nodes.caption;

    this._data.caption = caption.innerHTML;

    this.data.aspectRatio = (this.ui.nodes.videoEl?.videoWidth ?? 1) / (this.ui.nodes.videoEl?.videoHeight ?? 1);

    return this.data;
  }

  /**
   * Returns configuration for block tunes
   * @returns TunesMenuConfig
   */
  public renderSettings(): TunesMenuConfig {
    // Merge default tunes with the ones that might be added by user
    // @see https://github.com/editor-js/video/pull/49
    const tunes = VideoTool.tunes.concat(this.config.actions || []);
    const featureTuneMap: Record<string, string> = {
      caption: 'caption',
    };

    if (this.config.features?.caption === 'optional') {
      tunes.push({
        name: 'caption',
        icon: IconText,
        title: 'With caption',
        toggle: true,
      });
    }

    const availableTunes = tunes.filter((tune) => {
      const featureKey = Object.keys(featureTuneMap).find(key => featureTuneMap[key] === tune.name);

      if (featureKey === 'caption') {
        return this.config.features?.caption !== false;
      }

      return featureKey == null || this.config.features?.[featureKey as keyof FeaturesConfig] !== false;
    });

    /**
     * Check if the tune is active
     * @param tune - tune to check
     */
    const isActive = (tune: ActionConfig): boolean => {
      if (tune.name === 'caption') {
        return this.isCaptionEnabled ?? false;
      } else {
        return false;
      }
    };

    return availableTunes.map(tune => ({
      icon: tune.icon,
      label: this.api.i18n.t(tune.title),
      name: tune.name,
      toggle: tune.toggle,
      isActive: isActive(tune),
      onActivate: () => {
        /** If it'a user defined tune, execute it's callback stored in action property */
        if (typeof tune.action === 'function') {
          tune.action(tune.name);

          return;
        }
        let newState = !isActive(tune);

        /**
         * For the caption tune, we can't rely on the this._data
         * because it can be manualy toggled by user
         */
        if (tune.name === 'caption') {
          this.isCaptionEnabled = !(this.isCaptionEnabled ?? false);
          newState = this.isCaptionEnabled;
        }

        this.tuneToggled(tune.name as keyof VideoToolData, newState);
      },
    }));
  }

  /**
   * Fires after clicks on the Toolbox Video Icon
   * Initiates click on the Select File button
   */
  public appendCallback(): void {
    this.ui.nodes.fileButton.click();
  }

  /**
   * Specify paste substitutes
   * @see {@link https://github.com/codex-team/editor.js/blob/master/docs/tools.md#paste-handling}
   */
  public static get pasteConfig(): PasteConfig {
    return {
      /**
       * Paste HTML into Editor
       */
      tags: [
        {
          img: { src: true },
        },
      ],
      /**
       * Paste URL of video into the Editor
       */
      patterns: {
        video: /https?:\/\/\S+\.(webm|mp4)(\?[a-z0-9=]*)?$/i,
      },

      /**
       * Drag n drop file from into the Editor
       */
      files: {
        mimeTypes: ['video/*'],
      },
    };
  }

  /**
   * Specify paste handlers
   * @see {@link https://github.com/codex-team/editor.js/blob/master/docs/tools.md#paste-handling}
   * @param event - editor.js custom paste event
   *                              {@link https://github.com/codex-team/editor.js/blob/master/types/tools/paste-events.d.ts}
   */
  public async onPaste(event: PasteEvent): Promise<void> {
    switch (event.type) {
      case 'tag': {
        const video = (event.detail as HTMLPasteEventDetailExtended).data;

        /** Videos from PDF */
        if (/^blob:/.test(video.src)) {
          const response = await fetch(video.src);

          const file = await response.blob();

          this.uploadFile(file);
          break;
        }

        this.uploadUrl(video.src);
        break;
      }
      case 'pattern': {
        const url = (event.detail as PatternPasteEventDetail).data;

        this.uploadUrl(url);
        break;
      }
      case 'file': {
        const file = (event.detail as FilePasteEventDetail).file;

        this.uploadFile(file);
        break;
      }
    }
  }

  /**
   * Private methods
   * ̿̿ ̿̿ ̿̿ ̿'̿'\̵͇̿̿\з= ( ▀ ͜͞ʖ▀) =ε/̵͇̿̿/’̿’̿ ̿ ̿̿ ̿̿ ̿̿
   */

  /**
   * Stores all Tool's data
   * @param data - data in Video Tool format
   */
  private set data(data: VideoToolData) {
    this.video = data.file;

    this._data.caption = data.caption || '';
    this.ui.fillCaption(this._data.caption);

    this.data.aspectRatio = data.aspectRatio || 1;

    if (this.config.features?.caption === true) {
      this.ui.applyTune('caption', Boolean(data.caption || ''));
    }
  }

  /**
   * Return Tool data
   */
  private get data(): VideoToolData {
    return this._data;
  }

  /**
   * Set new video file
   * @param file - uploaded file data
   */
  private set video(file: VideoSetterParam | undefined) {
    this._data.file = file || { url: '' };

    if (file && file.url) {
      this.ui.fillVideo(file.url);
    }
  }

  /**
   * File uploading callback
   * @param response - uploading server response
   */
  private onUpload(response: UploadResponseFormat): void {
    if (response.success && Boolean(response.file)) {
      this.video = response.file;
    } else {
      this.uploadingFailed('incorrect response: ' + JSON.stringify(response));
    }
  }

  /**
   * Handle uploader errors
   * @param errorText - uploading error info
   */
  private uploadingFailed(errorText: string): void {
    console.log('Video Tool: uploading failed because of', errorText);

    this.api.notifier.show({
      message: this.api.i18n.t('Couldn’t upload video'),
      style: 'error',
    });
    this.ui.hidePreloader();
  }

  /**
   * Callback fired when Block Tune is activated
   * @param tuneName - tune that has been clicked
   * @param state - new state
   */
  private tuneToggled(tuneName: keyof VideoToolData, state: boolean): void {
    if (tuneName === 'caption') {
      this.ui.applyTune(tuneName, state);

      if (state == false) {
        this._data.caption = '';
        this.ui.fillCaption('');
      }
    } else {
      throw new Error(`There is no tune with name ${tuneName} in Video Tool`);
    }
  }

  /**
   * Show preloader and upload video file
   * @param file - file that is currently uploading (from paste)
   */
  private uploadFile(file: Blob): void {
    this.uploader.uploadByFile(file, {
      onPreview: () => {
        this.ui.showPreloader();
      },
    });
  }

  /**
   * Show preloader and upload video by target url
   * @param url - url pasted
   */
  private uploadUrl(url: string): void {
    this.ui.showPreloader();
    this.uploader.uploadByUrl(url);
  }
}
