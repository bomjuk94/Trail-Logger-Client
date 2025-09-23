import React from 'react'
import Entypo from '@expo/vector-icons/Entypo';
import type { TabBarIconProps } from '@/types'

const TabBarIcon = ({ name, color }: TabBarIconProps) => {
    const props = { name, color }
    return (
        <Entypo size={28} style={{ marginBottom: -3 }} {...props} />
    )
}

export default TabBarIcon