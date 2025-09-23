import Entypo from '@expo/vector-icons/Entypo';

export interface TabBarIconProps {
    name: React.ComponentProps<typeof Entypo>['name'];
    color: string;
}