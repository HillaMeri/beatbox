import { boxService } from "../../services/boxService"

export function loadBoxes(filterBy) {
  return async dispatch => {
    const boxes = await boxService.query(filterBy);
    dispatch({ type: 'SET_BOXES', boxes })
  };
}

export function loadBox(boxId) {
  return async dispatch => {
    const box = await boxService.getById(boxId);
    dispatch({ type: 'SET_BOX', box })
  };
}

export function saveBox(box) {
  return async dispatch => {
    const actionType = 'ADD_BOX';
    const newBox = await boxService.save(box);
    dispatch({ type: actionType, box: newBox })
    return newBox;
  };
}

export function updateBox(box) {
  return dispatch => {
    const actionType = 'EDIT_BOX';
    boxService.update(box);
    dispatch({ type: actionType, box })
  };
}

export function removeBox(boxId) {
  return async dispatch => {
    await boxService.remove(boxId)
    dispatch({ type: 'REMOVE_BOX', boxId })
  };
}

export function notify(txt) {
  return dispatch => {
    dispatch({ type: 'NOTIFY', isShown: true, msg: txt })
  }
}

export function closeNotification() {
  return dispatch => {
    dispatch({ type: 'NOTIFY', isShown: false, msg: '' })
  }
}