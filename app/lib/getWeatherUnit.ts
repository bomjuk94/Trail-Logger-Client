export const getWeatherUnit = (type: string) => {
    if (type === 'temp') {
        return '℃'
    } else if (type === 'percent') {
        return '%'
    } else if (type === 'distance') {
        return 'KM'
    } else if (type === 'speed') {
        return 'KM/H'
    }
}