﻿import "./SearchHeader.scss";

// SearchHeader contains the top bar - branching, the search box, and top-level buttons
export default React.createClass({
    getInitialState: function () {
        return { suggestions: [], sel: 0, completed: "", completionCharacters: [] };   
    },
    componentDidMount: function () {
        searchBox.focus();
        this.handleClickDocument = e => {
            if (e.target === searchBox) return; // Don't hide when clicking on input[text]
            this.setState({ suggestions: [] });
        }
        document.addEventListener("click", this.handleClickDocument);
        window.addEventListener("storage", this);
    },
    componentWillUnmount: function() {
        document.removeEventListener("click", this.handleClickDocument);
        window.removeEventListener("storage", this);
    },
    handleEvent: function(e) {
        // Assumed to be type="storage" as we only subscribed for that.
        if (["favorites"].includes(e.key)) setTimeout(() => this.forceUpdate()); // Just to update the star.
    },
    handleFocusOrBlur: function () {
        if (isIE()) this.bypassInputOnce = true;
    },
    onInput: function (e) {
        if (this.bypassInputOnce) {
            this.bypassInputOnce = false;
            return;
        }
        this.setQuery(e.target.value);
    },
    handleClick: function (e) {
        // Re-show the suggestion list even if the textbox already has focus.
        // Limiting to "", to avoid spurious re-shows if clicking around existing text.
        if (e.target.value === "") this.setQuery("");
    },
    handleKeyDown: function (e) {
        if (!this.state.suggestions.length) return;
        if (e.key === "ArrowUp") {
            this.setState({ sel: (this.state.sel - 1).clamp(0, this.state.suggestions.length - 1) });
            e.stopPropagation();
            e.preventDefault(); // Prevent cursor moving to beginning of line.
        }
        if (e.key === "ArrowDown") {
            this.setState({ sel: (this.state.sel + 1).clamp(0, this.state.suggestions.length - 1) });
            e.stopPropagation();
        }
        if (e.key === "Enter" || this.state.completionCharacters.includes(e.key)) {
            var item = this.state.suggestions[this.state.sel];

            var separator = (item.category === "Value" && e.key !== " " ? "" : " ");
            var suffix = (e.key === "Enter" || e.key === "Tab" || e.key === " ") ? "" : e.key;
            var newQuery = item.replaceAs || (this.state.completed + item.completeAs + separator + suffix);
            this.setQuery(newQuery);
            e.preventDefault(); // Suppress focus tabbing.
        }
        if (e.key === "Escape") {
            this.setState({ suggestions: [] });
        }
    },
    handleClickSuggestion: function (item) {
        var separator = (item.category === "Value" ? "" : " ");
        this.setQuery(item.replaceAs || this.state.completed + item.completeAs + separator);
        searchBox.focus();
    },
    setQuery: function (query) {
        this.props.onSearchChange(query);

        if (this.lastRequest) this.lastRequest.abort();
        this.lastRequest = jsonQuery(
            configuration.url + "/suggest?q=" + encodeURIComponent(query),
            data => this.setState({
                suggestions: data.content.suggestions,
                sel: 0,
                completed: data.content.complete, 
                completionCharacters: data.content.completionCharacters.map(c => ({ "\t": "Tab" })[c] || c),
            }),
            (xhr, status, err) => console.error(xhr.url, status, err.toString())
        );
    },
    toggleFavorite: function () {
        if (!this.props.parsedQuery) return;
        localStorage.updateJson("favorites", favs => ([] || favs).toggle(this.props.parsedQuery));
    },
    render: function () {

        // Generates a SVG histogram to be displayed behind the completion list.
        // The path goes counter-clockwise starting from the top-right.
        var svg = this.state.suggestions.length && (() => {
            var d = '';

            // The inst() currently concats SVG commands to the list 'd'.
            // However when debugging, it is useful to redirect the ...params to the console.
            const inst = (...params) => d += params.join(" ") + " ";

            // Scrape ___% from the item.hint. If not found, default to 0.
            const values = this.state.suggestions.map(item => new Number(item.hint.replace('%', '')) + 0 || 0);

            const w = 80; // Matches CSS declared width.
            inst("M", w, 0);
            inst("L", w - values[0] * 0.75, 0);
            const max = Math.max(...values) || 1; // Prevent divide by zero.
            var y = 0; // Running total fo the height.
            values.forEach(val => {
                const x = w - (val/max) * w;
                inst("S", x, y + 18 - 18, ",", x, y + 18);
                y += 37; // Matches the CSS declared height of each row.
            });
            inst("L", w - values[values.length - 1] * 0.75, y);
            inst("L", w, y);
            inst("Z");
            return <svg><path id="p" d={d} /></svg>
        })();

        return (
            <div className="header">
                <div className="title font-light">
                    <a href="/Search.html">{configuration.toolName}</a>
                </div>

                <div className="searchBarAndButtons">
                    <div className="searchBar">
                        <div className={ "loading " + (this.props.loading ? "loading-active" : "") }></div>
                        <input id="searchBox" ref="searchBox" type="text" spellCheck="false"
                            placeholder="Search for..." 
                            tabIndex="1" onInput={this.onInput} value={this.props.query} 
                            onKeyDown={this.handleKeyDown} onClick={this.handleClick} 
                            onFocus={this.handleFocusOrBlur} onBlur={this.handleFocusOrBlur}/>
                        <div className="rail">
                            {this.state.completed}
                            <span style={{ position: "relative" }} >
                                {this.state.suggestions.length > 0 &&
                                    <div className="suggestions" >
                                        {svg}
                                        {this.state.suggestions.map((item, index) =>
                                            <div className={"suggestion " + (this.state.sel == index ? "suggestion-sel" : "" )}
                                                onClick={ this.handleClickSuggestion.bind(this, item) }>
                                                <span>{item.display}</span>
                                                <span className="suggestion-hint">{item.hint}</span>
                                            </div>
                                        )}
                                    </div>
                                }
                            </span>
                        </div>
                        <i className={"searchIcon " + ((localStorage.getJson("favorites") || []).includes(this.props.parsedQuery) ? "icon-solid-star" : "icon-outlined-star")} onClick={this.toggleFavorite}></i>
                        <i className="searchIcon icon-find"></i>
                    </div>
                    <a title="Feedback" href={"mailto:" + encodeURIComponent(configuration.feedbackEmailAddresses) + "?subject=" + encodeURIComponent(configuration.toolName) + " Feedback"}>
                        <img src="/icons/feedback.svg" alt="feedback"/>
                    </a>
                    <a title="Help" href="/Search.html?help=true">
                        <img src="/icons/help.svg" alt="help"/>
                    </a>
                </div>
            </div>
        );
    }
});
