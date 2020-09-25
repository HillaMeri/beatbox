// OUTSOURCE IMPORT
import React, { Component } from 'react'
import { connect } from 'react-redux'
import CircleLoading from 'react-loadingg/lib/CircleLoading'

// LOCAL IMPORT
import { SongList } from '../cmps/box-details/SongList'
import { BoxInfo } from '../cmps/box-details/BoxInfo'
import { BoxWall } from '../cmps/box-details/BoxWall';
import { boxService } from '../services/boxService'
import { userService } from '../services/userService';
import { socketService } from '../services/socketService';
import { loadBox, updateBox, gotBoxUpdate } from '../store/actions/boxAction'
import { addMessage, loadMessages } from '../store/actions/messageAction'
import { setCurrSong } from '../store/actions/playerActions'
import { loadConnectedUsers,addConnectedUser } from '../store/actions/connectedUsersAction'
class _BoxDetails extends Component {
    state = {
        filterBy: '',
        isSongPickOpen: false,
        isDragging: false,
    }

    async componentDidMount() {
        const boxId = this.props.match.params.boxId;
        const minimalUser = userService.getMinimalUser();
        await this.props.loadBox(boxId);
        // await boxService.addConnectedUser(boxId, minimalUser);
        // SOCKET SETUP
        socketService.setup();
        const boxInfo = {
            boxId: this.props.box._id,
            user: minimalUser
        }
        socketService.emit('join box', boxInfo);
        socketService.on('get box status', this.setBoxStatus);
        // socketService.on('get box status', this.props.setCurrSong)
        socketService.on('song changed', this.props.setCurrSong);
        socketService.on('box changed', this.props.gotBoxUpdate);
        socketService.on('chat addMsg', this.props.addMessage);
        socketService.on('joined new box', this.props.loadConnectedUsers);
        socketService.on('leave box', this.props.loadConnectedUsers);
        // socketService.on('user add', this.props.addconnectedUser);
    }

    componentWillUnmount() {
        socketService.off('chat addMsg', this.props.addMessage);
    }

    setBoxStatus = (boxStatus) => {
        this.props.setCurrSong(boxStatus.currSong);
        this.props.loadMessages(boxStatus.msgs);
        // this.props.loadConnectedUsers(boxStatus.connectedUsers);
        // console.log("setBoxStatus -> boxStatus.connectedUsers", boxStatus.connectedUsers)
        // console.log(this.props.connectedUsers);
    }

    onRemoveSong = (ev, songId) => {
        if (ev) {
            ev.stopPropagation();
            ev.preventDefault();
        }

        const box = { ...this.props.box }
        const songIdx = box.songs.findIndex(song => song.id === songId)
        if (box.currSong.id === songId) {
            if (box.songs.length === 1) {
                box.currSong = null;
            } else {
                let nextSongIdx = songIdx + 1;
                if (nextSongIdx === box.songs.length) nextSongIdx = 0;
                box.currSong = { id: box.songs[nextSongIdx].id, isPlaying: true, played: 0 }
            }
        }
        const song = box.songs.splice(songIdx, 1);
        this.addMessageChat(`Song ${song[0].title} removed by ${this.props.user.username}`);
        this.props.updateBox(box)
    }

    onAddSong = (song) => {
        const newSong = boxService.addSong(song);
        const box = { ...this.props.box };
        box.songs.push(newSong);
        this.addMessageChat(`Song ${newSong.title} added by ${this.props.user.username}`);
        this.props.updateBox(box);
    }

    onPlaySong = (songId) => {
        const currSong = { id: songId, isPlaying: true, secPlayed: 0 };
        socketService.emit('set currSong', currSong);
        this.props.setCurrSong(currSong);
    }

    onSaveInfo = (box) => {
        this.props.updateBox(box);
    }

    onSetFilter = (filterBy) => {
        this.setState({ filterBy: filterBy.name })
    }

    getSongsForDisplay = () => {
        const songs = this.props.box.songs.filter(song => song.title.toLowerCase().includes(this.state.filterBy.toLowerCase()));
        return songs;
    }

    toggleSongPick = () => {
        this.setState({ isSongPickOpen: !this.state.isSongPickOpen })
    }

    onDragStart = () => {
        this.setState({ isDragging: true })
    }

    onDragEnd = (result) => {
        const { destination, source, draggableId } = result;
        this.setState({ isDragging: false })
        if (!destination) return;
        if (destination.droppableId === 'trash') {
            this.onRemoveSong(null, draggableId)
        }
        else if (destination.index === source.index) return;
        else this.onSwapSongs(source.index, destination.index);
    }

    addMessageChat = (msg) => {
        const messageObj = {
            text: msg,
            submitAt: new Date(),
            id: this.props.user._id,
            submitBy: this.props.user.username,
            avatar: this.props.user.imgUrl,
            type: 'system'
        }
        socketService.emit('chat newMsg', messageObj);
    }

    onToggleLikeBox = async (boxId, minimalUser) => {
        await boxService.addLike(boxId, minimalUser)
        await this.props.loadBox(boxId);
    }

    onSwapSongs = (srcIdx, destIdx) => {
        const newSongs = [...this.props.box.songs];
        const [songToMove] = newSongs.splice(srcIdx, 1);
        newSongs.splice(destIdx, 0, songToMove)
        const newBox = { ...this.props.box, songs: newSongs }
        this.props.updateBox(newBox);
    }

    render() {
        const { isSongPickOpen, isDragging, filterBy } = this.state;
        const { box, messages } = this.props;
        if (!box) return <CircleLoading size="large" color="#ac0aff" />
        const currSongId = box.currSong?.id || null;
        const songsToShow = this.getSongsForDisplay();
        const minimalUser = userService.getMinimalUser();
        return (
            <section className="box-details flex space-between">
                <div className="box-details-main flex column space-between">
                    <BoxInfo box={box} onSaveInfo={this.onSaveInfo} minimalUser={minimalUser} onToggleLikeBox={this.onToggleLikeBox} />
                    <SongList
                        songs={songsToShow}
                        onPlaySong={this.onPlaySong}
                        onRemoveSong={this.onRemoveSong}
                        onAddSong={this.onAddSong}
                        isSongPickOpen={isSongPickOpen}
                        toggleSongPick={this.toggleSongPick}
                        nowPlayingId={currSongId}
                        onDragStart={this.onDragStart}
                        onDragEnd={this.onDragEnd}
                        isFilter={!!filterBy}
                        isDragging={isDragging}
                    />

                </div>
                <BoxWall messages={messages} addMsg={this.addMsg} connectedUsers={this.props.connectedUsers}/>
            </section>
        )
    }
}
const mapStateToProps = state => {
    return {
        box: state.boxReducer.currBox,
        user: state.userReducer.loggedinUser,
        messages: state.messageReducer.messages,
        connectedUsers: state.connectedUsersReducer.connectedUsers
    }
}
const mapDispatchToProps = {
    loadBox,
    updateBox,
    addMessage,
    loadMessages,
    setCurrSong,
    gotBoxUpdate,
    addConnectedUser,
    loadConnectedUsers
}
export const BoxDetails = connect(mapStateToProps, mapDispatchToProps)(_BoxDetails);