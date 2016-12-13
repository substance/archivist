import { Component, FontAwesomeIcon as Icon, Grid, Input, Layout, SubstanceError as Err } from 'substance'
import findIndex from 'lodash/findIndex'
import isEmpty from 'lodash/isEmpty'

import moment from 'moment'

// Sample data for debugging
import DataSample from '../../data/docs'

class DocumentsPage extends Component {

  didMount() {
    this._loadData()
  }

  // willReceiveProps() {
  //   this._loadData()
  // }

  render($$) {
    let documentItems = this.state.items
    let el = $$('div').addClass('sc-documents')

    let header = this.renderHeader($$)
    el.append(header)

    let toolbox = this.renderToolbox($$)
    el.append(toolbox)

    if (!documentItems) {
      return el
    }

    if (documentItems.length > 0) {
      el.append(this.renderFull($$))
    } else {
      el.append(this.renderEmpty($$))
    }
    return el
  }

  renderFilters($$) {
    let filters = []
    let search = $$('div').addClass('se-search').append(
      $$(Icon, {icon: 'fa-search'}),
      $$(Input, {placeholder: 'Search...'})
        .on('keypress', this._onSearchKeyPress)
        .ref('searchInput')
    )
    filters.push(search)

    return filters
  }

  renderHeader($$) {
    let Header = this.getComponent('header')
    return $$(Header)
  }

  renderToolbox($$) {
    let Toolbox = this.getComponent('toolbox')
    let filters = this.renderFilters($$)

    let toolbox = $$(Toolbox, {
      actions: {
        'newDocument': '+ New Document'
      },
      content: filters
    })

    return toolbox
  }

  renderStatusBar($$) {
    var componentRegistry = this.context.componentRegistry;
    var StatusBar = componentRegistry.get('status-bar');

    return $$(StatusBar);
  }

  renderEmpty($$) {
    var layout = $$(Layout, {
      width: 'medium',
      textAlign: 'center'
    });

    layout.append(
      $$('h1').html(
        'No results'
      ),
      $$('p').html('Sorry, no documents matches your query')
    );

    return layout;
  }

  renderFull($$) {
    let urlHelper = this.context.urlHelper
    let items = this.state.items
    let total = this.state.total
    let page = this.state.page
    let perPage = this.state.perPage
    //let Pager = this.getComponent('pager')
    let grid = $$(Grid)

    if (items) {
      items.forEach(function(item, index) {
        let url = urlHelper.openDocument(item.documentId)
        let documentIcon = $$(Icon, {icon: 'fa-file-text-o'})
        let title = $$('a').attr({href: url}).append(item.title)
        let updatedAt = ['Updated', moment(item.updatedAt).fromNow(), 'by', item.updatedBy].join(' ')
        let more = $$(Icon, {icon: 'fa-ellipsis-v'})
        let className = item.summary ? 'se-expanded' : '' 

        let row = $$(Grid.Row).addClass('se-document-meta ' + className).ref(item.documentId).append(
            $$(Grid.Cell, {columns: 1}).addClass('se-badge').append(documentIcon),
            $$(Grid.Cell, {columns: 5}).addClass('se-title').append(title),
            $$(Grid.Cell, {columns: 3}).append(updatedAt),
            $$(Grid.Cell, {columns: 2}).append(item.count ? item.count + ' fragments' : ''),
            $$(Grid.Cell, {columns: 1}).addClass('se-more').append(more)
        ).on('click', this._loadFragments.bind(this, item.documentId, index))

        if(item.summary) {
          row.append(
            $$(Grid.Row).addClass('se-document-summary').append(
              $$(Grid.Cell, {columns: 12}).addClass('se-summary').append(item.summary)
            )
          )
        }

        grid.append(row)

        if(this.state.details === index && item.fragments) {
          item.fragments.forEach(function(fragment) {
            let fragmentIcon = $$(Icon, {icon: 'fa-comments-o'})
            grid.append(
              $$(Grid.Row).addClass('se-document-fragment').append(
                $$(Grid.Cell, {columns: 1}).addClass('se-badge').append(fragmentIcon),
                $$(Grid.Cell, {columns: 11}).addClass('se-fragment').append($$('p').setInnerHTML(fragment.content))
              )
            )
          })
        }
      }.bind(this))
    }
    return grid
  }

  /*
    Search documents
  */
  searchData() {
    let searchValue = this.refs['searchInput'].val()

    if(isEmpty(searchValue)) {
      return this._loadData()
    }

    let language = 'russian'
    let filters = {}
    let options = {}
    let documentClient = this.context.documentClient

    documentClient.searchDocuments(searchValue, language, filters, options, function(err, docs) {
      if (err) {
        this.setState({
          error: new Err('DocumentsPage.SearchError', {
            message: 'Search results could not be loaded.',
            cause: err
          })
        })
        console.error('ERROR', err)
        return
      }

      let details = findIndex(docs.records, function(record) {
        return record.fragments
      })

      this.extendState({
        items: docs.records,
        total: docs.total,
        details: details
      })
    }.bind(this))
  }

  /*
    Loads documents
  */
  _loadData() {
    // Sample data for debugging

    // this.extendState({
    //   items: DataSample,
    //   total: DataSample.length
    // });

    let documentClient = this.context.documentClient

    documentClient.listDocuments({}, {}, function(err, docs) {
      if (err) {
        this.setState({
          error: new Err('DocumentsPage.LoadingError', {
            message: 'Documents could not be loaded.',
            cause: err
          })
        })
        console.error('ERROR', err)
        return
      }

      this.extendState({
        items: docs.records,
        total: docs.total
      })
    }.bind(this))
  }

  _loadFragments(documentId, index) {
    let searchValue = this.refs['searchInput'].val()

    if(isEmpty(searchValue)) {
      return
    }

    let language = 'russian'
    let filters = {}
    let options = {}
    let documentClient = this.context.documentClient
    let items = this.state.items

    if(!items[index].fragments) {
      documentClient.searchFragments(documentId, searchValue, language, filters, options, function(err, fragments) {
        if (err) {
          this.setState({
            error: new Err('DocumentsPage.FragmentsSearchError', {
              message: 'Search results could not be loaded.',
              cause: err
            })
          })
          console.error('ERROR', err)
          return
        }

        items[index].fragments = fragments

        this.extendState({
          items: items,
          details: index 
        })
      }.bind(this))
    } else {
      this.extendState({details: index})
    }
  }

  _onSearchKeyPress(e) {
    // Perform search query on pressing enter
    if (e.which === 13 || e.keyCode === 13) {
      this.searchData()
      return false
    }
  }
}

export default DocumentsPage