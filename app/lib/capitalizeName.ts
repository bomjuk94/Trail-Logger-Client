function capitalizeName(name: string | undefined) {
    if (!name) return 'Unknown';

    return name
        .split(" ")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

export { capitalizeName };
