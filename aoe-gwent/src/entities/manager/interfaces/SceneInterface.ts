export interface SceneInterface {
    /** resize scene
     * 
     * @param screenWidth 
     * @param screenHeight 
     */
    resize(screenWidth: number, screenHeight: number): void;

    /**
     * 
     */
    destroy(): void;
}