export const timeConverter = () => {

    function formatSecondsToHHMMSS(seconds: number): string {
        if (!Number.isFinite(seconds) || seconds < 0) return "00:00:00";

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        return [
            String(hours).padStart(2, "0"),
            String(minutes).padStart(2, "0"),
            String(secs).padStart(2, "0"),
        ].join(":");
    }

    return {
        formatSecondsToHHMMSS,
    }
}