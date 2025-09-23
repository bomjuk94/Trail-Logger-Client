export const formatNumbers = () => {

    const roundUp = (num: number) => {
        return Math.ceil(num)
    }

    return {
        roundUp,
    }
}