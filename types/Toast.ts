type NotificationType = 'success' | 'error'

export interface ShowToastProps {
    type: NotificationType
    msg?: string;
    errors?: string[];
}