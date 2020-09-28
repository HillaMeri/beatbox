// OUTSOURCE IMPORT
import React, { Component } from 'react'
import { connect } from 'react-redux'
import CircleLoading from 'react-loadingg/lib/CircleLoading'
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { Fab } from '@material-ui/core';
import AddIcon from '@material-ui/icons/Add';
import FavoriteIcon from '@material-ui/icons/Favorite';
import WhatsappIcon from '@material-ui/icons/WhatsApp';
import FacebookIcon from '@material-ui/icons/Facebook';
import LinkIcon from '@material-ui/icons/Link';
import ColorThief from "colorthief";
import QuestionAnswerIcon from '@material-ui/icons/QuestionAnswer';
import { Swipeable } from "react-swipeable";
// LOCAL IMPORT
import { SongList } from '../cmps/box-details/SongList'
import { BoxInfo } from '../cmps/box-details/BoxInfo'
import { boxService } from '../services/boxService'
import { userService } from '../services/userService';
import { socketService } from '../services/socketService';
import { loadBox, updateBox, gotBoxUpdate } from '../store/actions/boxAction'
import { addMsg, loadMsgs } from '../store/actions/msgAction'
import { changeSong, updateLocalPlayer } from '../store/actions/playerActions'
import { loadConnectedUsers } from '../store/actions/connectedUsersAction'
import { youtubeService } from '../services/youtubeService';
import { BoxChat } from '../cmps/box-details/BoxChat'

class _BoxDetails extends Component {
    state = {
        isSongPickOpen: false,
        isDragging: false,
        msgs: [],
        dominantColor: '',
        isMobileChatOpen: false,
        isClipboardToast: false,
        isFavorite: false
    }

    imgRef = React.createRef();

    async componentDidMount() {
        const boxId = this.props.match.params.boxId;
        const minimalUser = userService.getMinimalUser();
        await this.props.loadBox(boxId);
        // await boxService.addConnectedUser(boxId, minimalUser);
        
        // SOCKET SETUP
        const boxInfo = {
            boxId,
            user: minimalUser
        }
        socketService.emit('join box', boxInfo);
    }

    onRemoveSong = async (songId) => {
        const { currSong } = this.props;
        const newBox = { ...this.props.currBox }
        const songIdx = newBox.songs.findIndex(song => song.id === songId)
        if (currSong.id === songId) {
            if (newBox.songs.length === 1) {
                await this.props.updateLocalPlayer(null)
            } else {
                let nextSongIdx = songIdx + 1;
                if (nextSongIdx === newBox.songs.length) nextSongIdx = 0;
                await this.props.changeSong(newBox.songs[nextSongIdx].id)
            }
        }
        const [song] = newBox.songs.splice(songIdx, 1);
        this.addMsgChat(`Song ${song.title} removed by ${this.props.user.username}`);
        this.props.updateBox(newBox);
    }

    onAddSong = async (song, idx, isFromDrag) => {
        const newSong = await boxService.addSong(song, isFromDrag);
        const newBox = { ...this.props.currBox };
        if (idx) {
            newBox.songs.splice(idx, 0, newSong);
        }
        else newBox.songs.unshift(newSong);
        this.addMsgChat(`Song ${newSong.title} added by ${this.props.user.username}`);
        this.props.updateBox(newBox);
    }

    onSaveInfo = (box) => {
        this.props.updateBox(box);
    }

    getSongsForDisplay = () => {
        const songs = this.props.currBox.songs.filter(song => {
            return song.title.toLowerCase().includes(this.props.filter.toLowerCase());
        })
        return songs;
    }

    toggleSongPick = () => {
        this.setState(prevState => ({ isSongPickOpen: !prevState.isSongPickOpen }))
    }

    onDragStart = () => {
        this.setState({ isDragging: true })
    }

    onDragEnd = async (result) => {
        const { destination, source, draggableId } = result;

        this.setState({ isDragging: false })
        if (!destination) return;
        if (destination.droppableId === 'songPick') return;
        if (source.droppableId === 'songList' && destination.droppableId === 'trash') {
            this.onRemoveSong(draggableId)
            return;
        }
        if (source.droppableId === 'songPick' && destination.droppableId === 'songList') {
            let song = await youtubeService.getSongById(draggableId);
            [song] = song.items;
            this.onAddSong(song, destination.index, true);
            return;
        }

        if (destination.index === source.index) return;
        else this.onSwapSongs(source.index, destination.index);
    }

    addMsgChat = (msg) => {
        const msgObj = {
            text: msg,
            // submitAt: new Date(),
            id: 'system',
            submitBy: 'system',
            avatar: this.props.user.imgUrl,
            // from: 'system'
        }
        socketService.emit('chat newMsg', msgObj);
    }

    onSwapSongs = (srcIdx, destIdx) => {
        const newSongs = [...this.props.currBox.songs];
        const [songToMove] = newSongs.splice(srcIdx, 1);
        newSongs.splice(destIdx, 0, songToMove);
        const newBox = { ...this.props.currBox, songs: newSongs };
        this.props.updateBox(newBox);
    }

    getDominantColor = () => {
        const colorThief = new ColorThief();
        const img = this.imgRef.current;
        let result = colorThief.getColor(img, 50);
        if (result.every(color => color > 180)) result = result.map(color => (color > 150) ? 150 : color);
        this.setState({ dominantColor: result });
    }

    toggleClipboardToast = () => {
        this.setState({ isClipboardToast: true });
        setTimeout(() => this.setState({ isClipboardToast: false }), 2000);
    }

    toggleMobileMenu = () => {
        this.setState({ isMobileChatOpen: !this.state.isMobileChatOpen })
    }

    onToggleToFavorite = () => {
        // const boxId = this.props.currBox._id;
        // userService.toggleToFavorite(boxId);
        // this.setState({ isFavorite: !this.state.isFavorite });
    }

    getIfBoxFavorite = async () => {
        const boxId = this.props.currBox._id;
        const userId = this.props.user._id;
        const isFavoriteIdx = await userService.isBoxFavorite(userId, boxId)
        const isFavorite = (isFavoriteIdx === -1) ? true : false;
        return isFavorite;
    }



    render() {
        const { isSongPickOpen, isDragging, isFavorite } = this.state;
        const { currBox, filter } = this.props;
        if (!currBox) return <CircleLoading size="large" color="#ac0aff" />
        const songsToShow = this.getSongsForDisplay();
        const minimalUser = userService.getMinimalUser();
        const swipeConfig = {
            onSwipedRight: () => this.toggleMobileMenu(),
            onSwipedLeft: () => this.toggleMobileMenu(),
            preventDefaultTouchmoveEvent: true,
            trackMouse: true
        };

        return (
            <Swipeable {...swipeConfig}>
                <section className="box-details" style={{ backgroundColor: `rgb(${this.state.dominantColor})` }}>
                    <div className="box-details-main flex column">

                        <BoxInfo
                            getDominantColor={this.getDominantColor}
                            imgRef={this.imgRef}
                            box={currBox}
                            onSaveInfo={this.onSaveInfo}
                            minimalUser={minimalUser}
                        />

                        <div className="song-social-actions flex space-between">
                            <div className="btns-container flex">
                                <Fab className={`add-song-btn  ${isSongPickOpen ? 'opened' : ''}`}
                                    onClick={this.toggleSongPick}
                                    aria-label="add"
                                >
                                    <AddIcon />
                                </Fab>

                                <div title="Add to favorite" className={`like-btn ${isFavorite ? "favorite" : ""}`}>
                                    <FavoriteIcon onClick={this.onToggleToFavorite} />
                                </div>
                            </div>

                            <div className="share-container flex space-between column">
                                <p>Invite a friend<br />to join you live:</p>
                                <div className="share-btns flex space-evenely">
                                    <a className="facebook-share-btn"
                                        href={`https://www.facebook.com/sharer/sharer.php?u=${window.location.href}`}
                                        rel="noopener noreferrer" target="_blank">
                                        <FacebookIcon />
                                    </a>
                                    <a className="whatsapp-share-btn"
                                        href={`whatsapp://send?text=${currBox.createdBy.name} Shared a Box With You! : \n\n ${window.location.href}`}
                                        data-action="share/whatsapp/share">
                                        <WhatsappIcon />
                                    </a>
                                    <CopyToClipboard text={window.location.href}>
                                        <LinkIcon onClick={this.toggleClipboardToast} style={{ transform: 'rotate(45deg) translateY(1px) translateX(4px)' }} />
                                    </CopyToClipboard>
                                </div>
                                {this.state.isClipboardToast && <div className="copied-to-clipboard"><small>Link copied to your clipboard!</small></div>}
                            </div>

                        </div>

                        <SongList
                            songs={songsToShow}
                            onRemoveSong={this.onRemoveSong}
                            onAddSong={this.onAddSong}
                            isSongPickOpen={isSongPickOpen}
                            onDragStart={this.onDragStart}
                            onDragEnd={this.onDragEnd}
                            isFilter={!!filter}
                            isDragging={isDragging}
                        />
                    </div>

                    <div className={`${this.state.isMobileChatOpen ? 'chat-open' : ''} chat-box flex column`} >
                        <BoxChat />
                        {/* <BoxWall msgs={msgs} addMsg={this.addMsg} connectedUsers={this.props.connectedUsers} /> */}
                    </div>

                    <button className={`${this.state.isMobileChatOpen ? 'chat-open' : ''} mobile-chat-btn`}
                        onClick={this.toggleMobileMenu}><QuestionAnswerIcon /></button>
                    {/* <BoxWall msgs={msgs} addMsg={this.addMsg} /> */}
                </section>
            </Swipeable>
        )
    }
}


const mapStateToProps = state => {
    return {
        currBox: state.boxReducer.currBox,
        currSong: state.boxReducer.currSong,
        filter: state.boxReducer.filter,
        user: state.userReducer.loggedinUser,
        msgs: state.msgReducer.msgs,
        connectedUsers: state.connectedUsersReducer.connectedUsers
    }
}
const mapDispatchToProps = {
    loadBox,
    updateBox,
    addMsg,
    loadMsgs,
    updateLocalPlayer,
    gotBoxUpdate,
    // addConnectedUser,
    loadConnectedUsers,
    changeSong
}
export const BoxDetails = connect(mapStateToProps, mapDispatchToProps)(_BoxDetails);