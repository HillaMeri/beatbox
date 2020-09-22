const initialState = {
    messages: null
}

export function messageReducer(state = initialState, action) {
    switch (action.type) {

        case 'SET_MESSAGES':
            return {
                ...state,
                messages: action.messages
            }
        case 'ADD_MESSAGE':
            return {
                ...state, messages: [...state.messages, action.message]
            }
        default:
            return state;
    }
}
