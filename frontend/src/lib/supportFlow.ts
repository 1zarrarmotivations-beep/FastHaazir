export type SupportCategory =
    | 'order_late'
    | 'rider_issue'
    | 'payment_issue'
    | 'app_problem'
    | 'cancel_request'
    | 'other';

export interface SupportStep {
    id: string;
    message: string;
    options?: {
        label: string;
        nextStepId?: string;
        action?: 'escalate' | 'resolve' | 'input';
        category?: SupportCategory;
    }[];
}

export const SUPPORT_FLOW: Record<string, SupportStep> = {
    start: {
        id: 'start',
        message: "Hello! I'm your FastHaazir Support Assistant. How can I help you today?",
        options: [
            { label: "My order is late", nextStepId: 'order_late_status', category: 'order_late' },
            { label: "Rider not responding", nextStepId: 'rider_contact', category: 'rider_issue' },
            { label: "Payment/Refund issue", nextStepId: 'payment_help', category: 'payment_issue' },
            { label: "Cancel my order", nextStepId: 'cancel_policy', category: 'cancel_request' },
            { label: "Something else", nextStepId: 'other_help', category: 'other' }
        ]
    },

    // Late Order Flow
    order_late_status: {
        id: 'order_late_status',
        message: "I'm sorry to hear that. I'm checking your most recent order status... Our average delivery time is 30-45 mins. Has it been longer than that?",
        options: [
            { label: "Yes, it's very late", nextStepId: 'escalate_now', action: 'escalate' },
            { label: "I'll wait a bit more", nextStepId: 'resolve_positive', action: 'resolve' }
        ]
    },

    // Rider Issue Flow
    rider_contact: {
        id: 'rider_contact',
        message: "You can try calling the rider directly from the order screen. If they are still not replying, I can connect you to an agent.",
        options: [
            { label: "Connect to Agent", nextStepId: 'escalate_now', action: 'escalate' },
            { label: "I'll try calling again", nextStepId: 'resolve_positive', action: 'resolve' }
        ]
    },

    // Payment Flow
    payment_help: {
        id: 'payment_help',
        message: "For payment issues, please provide a brief description of what happened (e.g., double charged, promo not applied).",
        options: [
            { label: "Describe Issue", action: 'input', nextStepId: 'escalate_now' },
            { label: "Nevermind", nextStepId: 'resolve_positive', action: 'resolve' }
        ]
    },

    // Cancel Flow
    cancel_policy: {
        id: 'cancel_policy',
        message: "Orders can only be cancelled if the restaurant hasn't started preparing them. Would you like to request a cancellation?",
        options: [
            { label: "Yes, request cancel", nextStepId: 'escalate_now', action: 'escalate' },
            { label: "No, keep my order", nextStepId: 'resolve_positive', action: 'resolve' }
        ]
    },

    // Generic Escalation
    escalate_now: {
        id: 'escalate_now',
        message: "I'm connecting you to a support agent who will look into this immediately. Please stay typed in...",
        options: []
    },

    other_help: {
        id: 'other_help',
        message: "Please tell me more about your concern so I can help you better.",
        options: [
            { label: "Talk to Human", nextStepId: 'escalate_now', action: 'escalate' }
        ]
    },

    resolve_positive: {
        id: 'resolve_positive',
        message: "Great! Glad I could help. Is there anything else?",
        options: [
            { label: "No, thanks", action: 'resolve' },
            { label: "Yes, start over", nextStepId: 'start' }
        ]
    }
};
