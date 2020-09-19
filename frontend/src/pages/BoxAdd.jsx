import React, { Component } from 'react'
import { connect } from 'react-redux'

import { boxService } from '../services/boxService'
import { saveBox,loadBoxes } from '../store/actions/boxAction'
// import { cloudService } from '../services/cloudService'
// import { SongPick } from '../cmps/box-details/SongPick'
// import { SongPreview } from '../cmps/box-details/SongPreview'
import { BoxInfoEdit } from '../cmps/box-details/BoxInfoEdit'
import { SongList } from '../cmps/box-details/SongList'

export class _BoxAdd extends Component {
    state = {
        box: null,
        msgWarnnig: '',
        isSearchOpen: false
    }

    componentDidMount() {
        const emptyBox = boxService.getEmptyBox();
        this.setState({ box: emptyBox })
    }

    printMsg() {
        this.setState({ msgWarnnig: 'Name of box is required' })
        setTimeout(() => {
            this.setState({ msgWarnnig: '' })
        }, 2000)
    }

    onAddBox = async (ev) => {
        ev.preventDefault();
        if (!this.state.box.name) {
            this.printMsg();
            return;
        }
        const newBox = await this.props.saveBox(this.state.box);
       await this.props.loadBoxes();
        this.props.history.push(`/box/${newBox._id}`);
    }

    updateBox = (box) => {
        this.setState(prevState => {
            return {
                box: {
                    ...prevState.box,
                    name: box.name,
                    tags: box.tags,
                    description: box.description,
                    imgUrl: box.imgUrl
                }
            }
        })
    }
    
    onRemoveSong = (ev, songId) => {
        ev.stopPropagation();
        ev.preventDefault();
        const box = { ...this.state.box }
        const songIdx = box.songs.findIndex(song => song.id === songId)
        box.songs.splice(songIdx, 1);
        this.props.saveBox(box)
        // await this.props.removeSong(songId)
    }
    onAddSong = (song) => {
        const newSong = boxService.addSong(song);
        const songs = [...this.state.box.songs, newSong];
        this.setState(prevState => {
            return {
                box: {
                    ...prevState.box,
                    songs
                }
            }
        })
    }

    openAddSearch = () => {

        this.setState({ isSearchOpen: !this.state.isSearchOpen })
    }

    //Add Song pick
    render() {
        const { box, isSearchOpen } = this.state;
        if (!box) return <h1>Loading...</h1>
        return (
            <section className="box-add main-container">
                <h2>Create Your Box</h2>
                <BoxInfoEdit updateBox={this.updateBox} />
                <SongList songs={box.songs}
                    onRemoveSong={this.onRemoveSong}
                    onAddSong={this.onAddSong}
                    openAddSearch={this.openAddSearch}
                    isSearchOpen={isSearchOpen} />
                <div className="btn-create-container">
                    <button className="btn-create" onClick={this.onAddBox}>Create Box</button>
                    {this.state.msgWarnnig && <label>{this.state.msgWarnnig}</label>}
                </div>
            </section>
        )
    }
}

const mapStateToProps = state => {
    return {
        // boxes: state.boxReducer.boxes,
    }
}
const mapDispatchToProps = {
    saveBox,
    loadBoxes
}

export const BoxAdd = connect(mapStateToProps, mapDispatchToProps)(_BoxAdd)