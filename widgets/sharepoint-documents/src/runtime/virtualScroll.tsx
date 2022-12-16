/** @jsx jsx */

import {AllWidgetProps, jsx, React} from "jimu-core";
import {useInfiniteQuery} from 'react-query';
import {useVirtual} from 'react-virtual';
import {useState} from 'react';
import {Loading, Button, Icon, Tooltip} from 'jimu-ui';
import {CalciteBlock, CalciteList, CalciteListItem, CalciteButton} from 'calcite-components'

async function queryRelationshipList(graphClient, relationshipListUrl, globalid) {
  return graphClient.api(`${relationshipListUrl}/items?$filter=fields/RecordFK+eq+'${globalid}'`)
    .get().then(r => r.value);
}

function deleteRelationship(graphClient, relationshipListUrl, doc, uniqueid) {
  doc.fields.ReverseRecordFKs.forEach((d) => {
    if (d.LookupValue === uniqueid) {
      return graphClient.api(`${relationshipListUrl}/items/${d.LookupId}`).delete();
    }
  })
}

// async function batchQueryRelationshipList(graphClient, relationshipListUrl, globalids) {
//   const requests = globalids.map((g, i) => {
//     return {
//       id: i,
//       method: "GET",
//       url: `${relationshipListUrl}/items?$filter=fields/RecordFK+eq+'${g}'`
//     }
//   });
//   return graphClient.api('https://graph.microsoft.com/v1.0/$batch').post({requests})
//     .then(r => r.responses.map(x => x.body.value));
// }

function buildFilterString(items) {
  return items.map(i => `fields/ReverseRecordFKsLookupId+eq+${i.id}`).join('+OR+')
}

async function queryDocumentList(graphClient, listUrl, filter) {
  return graphClient.api(`${listUrl}/items?expand=fields&$filter=${filter}`)
    .header("Prefer", "HonorNonIndexedQueriesWarningMayFailRandomly")
    .get().then(r => r.value);
}

// async function batchQueryDocumentList(graphClient, listUrl, globalids, relationships) {
//   const requests = globalids.map((g, i) => {
//     if (relationships[i].length > 0) {
//       return {
//         id: i,
//         method: 'GET',
//         url: `${listUrl}/items?expand=fields&$filter=${buildFilterString(relationships[i])}`,
//         headers: {
//           Prefer: "HonorNonIndexedQueriesWarningMayFailRandomly"
//         }
//       }
//     }
//     return false;
//   }).filter(x => x);
//
//   return graphClient.api('https://graph.microsoft.com/v1.0/$batch').post({requests});
// }

async function queryList(graphClient, listUrl, relationshipListUrl, globalid) {
  const relationshipItems = await queryRelationshipList(graphClient, relationshipListUrl, globalid);
  let listItems = []
  if (relationshipItems.length > 0) {
    const filterString = buildFilterString(relationshipItems);
    listItems = await queryDocumentList(graphClient, listUrl, filterString);
  }
  return listItems
}

// incomplete...still need to relink documents to items and break apart queries that are too big
// async function batchQueryList(graphClient, listUrl, relationshipListUrl, globalids) {
//   const relationshipResults = await batchQueryRelationshipList(graphClient, relationshipListUrl, globalids);
//   return await batchQueryDocumentList(graphClient, listUrl, globalids, relationshipResults);
// }

function calcItemHeight(documents) {
  return `${61.5 + (documents?.length > 0 ? documents?.length * 51 : 0)}px`;
}

function getDescription(document) {
  let description = null
  if (document.createdBy && document.createdBy.user && document.createdBy.user.displayName && document.createdDateTime) {
    let createdBy = document.createdBy.user.displayName
    let createdDate = new Date(document.createdDateTime)
    // console.log(new Date(createdDate))
    description = `Created ${createdDate.toLocaleString()} by ${createdBy}`
  }
  return description
}

function getLabel(document) {
  let label = null
  if (document.fields && document.fields.LinkFilename) {
    label = document.fields.LinkFilename
    if (label.length >= 30) {
      let labelStart = label.substring(0,15)
      let labelEnd = label.substring(label.length-15)
      label = `${labelStart}[...]${labelEnd}`
    }
  }
  return label
}


function Item(props) {
  const [documents, setDocuments] = useState(props.documents);
  const [deleting, setDeleting] = useState(props.deleting)

  const flexboxStyle = {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginRight: "10px"
  }

  React.useEffect(() => {

  })

  const confirmRemove = (doc) => () => {
    setDeleting(doc.fields.id)
  }

  const remove = (doc) => () => {
    deleteRelationship(props.graphClient, props.relationshipListUrl, doc, props.item.UNIQUE_ID);

    setDocuments(documents.filter((e) => {
      return e.fields.id !== doc.fields.id;
    }));
  }

  // return (<div className="p-3" style={{height: calcItemHeight(documents)}}>
  //   <h5 style={{marginBottom: 0}}>{props.item.LABEL}</h5>
  // console.log(documents)
  return (
    <CalciteBlock
      style={{
        height: calcItemHeight(documents),
        maxHeight: calcItemHeight(documents)
      }}
      heading={props.item.LABEL}
      summary={documents.length === 0 ? "No documents found for this site" : null}
      open
    >
      {documents.length > 0 && (
        <CalciteList>
          {documents.map((document) => 
            <CalciteListItem 
              label={deleting != document.fields.id ? getLabel(document) : "Delete this document?"}
              title={deleting != document.fields.id ? document.fields.LinkFilename : "Delete this document?"}
              description={deleting != document.fields.id ? getDescription(document) : getLabel(document)}
              nonInteractive
            >
              {deleting != document.fields.id &&
                <CalciteButton
                  slot="actions-start"
                  color="neutral"
                  appearance="transparent"
                  iconEnd="launch"
                  href={document.webUrl}
                  title="View document in new tab"
                  target="_blank"
                  scale="s"
                />
              }
              
              {props.deleteAccess === true && deleting != document.fields.id ?
                <CalciteButton
                  slot="actions-end"
                  color="neutral"
                  appearance="transparent"
                  iconEnd="trash"
                  title="Delete document"
                  scale="s"
                  onClick={confirmRemove(document)}
                />
                :
                <div slot="actions-end">
                  <CalciteButton
                    title="Yes"
                    className="px-1"
                    onClick={remove(document)}
                  >
                    Yes
                  </CalciteButton>
                  <CalciteButton
                    title="No"
                    className="px-1"
                    onClick={() => setDeleting(null)}
                  >
                    No
                  </CalciteButton>
                </div>
              }
            </CalciteListItem>
          )}
        </CalciteList>
      )}
      {/* {documents.length > 0
        ? [...documents.map(i =>
              <div>
                <div>
                  <Tooltip onClose={function noRefCheck(){}} onOpen={function noRefCheck(){}} title={i.fields.LinkFilename}>
                    <a href={i.webUrl} target="_blank">
                      <ListItem title={i.fields.LinkFilename}/>
                    </a>
                  </Tooltip>
                </div>
                {props.deleteAccess === true
                ? <Button icon onClick={remove(i)} size="sm" style={{width:"20px", height:"20px", border:"transparent"}}>
                    <Icon
                        icon="<svg xmlns='http://www.w3.org/2000/svg' fill='currentColor' className='bi bi-trash' viewBox='0 0 16 16'><path d='M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z'/><path fill-rule='evenodd' d='M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z'/></svg>"
                        size="m"
                    />
                  </Button>
                : null}
              </div>)]
        : null} */}
      {/* <hr></hr> */}
    </CalciteBlock>)
}

export default function VirtualScroll(props: AllWidgetProps) {
  const [documents, setDocuments] = useState({});
  const [documentCount, setDocumentCount] = useState(0);

  const {
    data,
    isFetching,
    hasNextPage,
    fetchNextPage
  } = useInfiniteQuery(
    props.selectionId,
    async ({pageParam = 0}) => {
      // can potential batch queries to speed things up but logic is incomplete
      // const globalids = props.selectedObjects.map(i => i.GlobalID);
      // return batchQueryList(props.graphClient, props.listUrl, props.relationshipListUrl, globalids).then(r => {
      //   console.log(r);
      //   return {data: r, next: pageParam}
      // });
      const promises = props.selectedObjects
        .slice(pageParam * 10, (pageParam + 1) * 10)
        .map(i => queryList(props.graphClient, props.listUrl, props.relationshipListUrl, i.UNIQUE_ID).then(r => {
          documents[i.UNIQUE_ID] = r;
          setDocuments(documents);
          return {LABEL: i.LABEL, UNIQUE_ID: i.UNIQUE_ID}
        }));
      return await Promise.all(promises).then(results => {
        return {data: results, next: pageParam}
      });
    },
    {
      getNextPageParam: (lastPage: any, group: any) => {
        return lastPage.next < props.selectedObjects.length / 10 ? lastPage.next + 1 : false
      }
    }
  )
  const pageData = data ? data.pages.flat(1).map(p => p.data).flat(1) : []

  const parentRef = React.useRef()

  const rowVirtualizer = useVirtual({
    size: hasNextPage ? pageData.length + 1 : pageData.length,
    parentRef,
    // estimateSize: React.useCallback(() => 50, []),
  });


  React.useEffect(() => {
    console.log('file added');
    if (props.addedItem) {
      let c = 0;
      pageData.forEach(p => {
        documents[p.UNIQUE_ID].push(props.addedItem)
        c = c + documents[p.UNIQUE_ID].length;
      });
      setDocuments(documents);
      setDocumentCount(c);
    }
  }, [props.addedItem])


  React.useEffect(() => {
    const [lastItem] = [...rowVirtualizer.virtualItems].reverse();

    if (!lastItem) {
      return;
    }

    if (
      lastItem.index >= pageData.length - 1 &&
      hasNextPage &&
      !isFetching
    ) {
      fetchNextPage();
    }
  }, [
    hasNextPage,
    fetchNextPage,
    pageData.length,
    isFetching,
    rowVirtualizer.virtualItems,
    documentCount
  ]);
  return <div
    ref={parentRef}
    className="List"
    style={{
      height: `100%`,
      width: `100%`,
      overflow: "auto"
    }}
  >
    <div
      id="virtualScrollDiv"
      style={{
        height: `${rowVirtualizer.totalSize}px`,
        width: "100%",
        position: "relative",
        marginTop: "-0.5rem"
      }}
    >
      {rowVirtualizer.virtualItems.map((virtualRow) => {
        const isLoaderRow = virtualRow.index > pageData.length - 1;
        const item = pageData[virtualRow.index];
        let itemDocuments = []
        if (documents && item && item.UNIQUE_ID && documents.hasOwnProperty(item.UNIQUE_ID)) {
          itemDocuments = documents[item.UNIQUE_ID]
        }

        return (
              <div
                  key={virtualRow.index}
                  ref={el => virtualRow.measureRef(el)}
                  className={virtualRow.index % 2 ? "ListItemOdd" : "ListItemEven"}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: calcItemHeight(itemDocuments),
                    transform: `translateY(${virtualRow.start}px)`
                  }}
              >
                {isLoaderRow ? hasNextPage ? <Loading type='SECONDARY'/> : 'Done' :
                    <Item item={item} documents={itemDocuments} graphClient={props.graphClient}
                          relationshipListUrl={props.relationshipListUrl} deleteAccess={props.deleteAccess} deleting={null}></Item>}
              </div>
        )
      })}
    </div>
  </div>
};
