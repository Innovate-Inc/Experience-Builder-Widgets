/** @jsx jsx */

import { AllWidgetProps, jsx, React } from "jimu-core";
import { useInfiniteQuery } from 'react-query';
import { useVirtual } from 'react-virtual';
import { useState } from 'react';
import { Loading, Button, Icon, Tooltip } from 'jimu-ui';
import { CalciteBlock, CalciteList, CalciteListItem, CalciteButton } from 'calcite-components'

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
    description = `Uploaded ${createdDate.toLocaleDateString()} by ${createdBy}`
  }
  return description
}

function getLabel(document) {
  let label = null
  if (document.fields && document.fields.LinkFilename) {
    label = document.fields.LinkFilename
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
  return (
    <CalciteBlock
      style={{
        minHeight: calcItemHeight(documents)
        // maxHeight: calcItemHeight(documents)
      }}
      className="my-1 mx-2"
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
    async ({ pageParam = 0 }) => {
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
          return { LABEL: i.LABEL, UNIQUE_ID: i.UNIQUE_ID }
        }));
      return await Promise.all(promises).then(results => {
        return { data: results, next: pageParam }
      });
    },
    {
      getNextPageParam: (lastPage: any, group: any) => {
        return lastPage.next < props.selectedObjects.length / 10 ? lastPage.next + 1 : false
      }
    }
  )
  const pageData = data ? data.pages.flat(1).map(p => p.data).flat(1) : []
  // console.log(pageData)
  const parentRef = React.useRef()

  const rowVirtualizer = useVirtual({
    size: hasNextPage ? pageData.length + 1 : pageData.length,
    parentRef,
    // estimateSize: React.useCallback(() => 50, []),
  });


  React.useEffect(() => {
    if (props.sessionUploads.length > 0) {
      props.sessionUploads.forEach(upload => {
        let c = 0;
        pageData.forEach(p => {
          console.log(p)
          console.log(upload)
          if (upload.recordId === p.UNIQUE_ID) {
            if (!documents[p.UNIQUE_ID].includes(upload.document)) {
              documents[p.UNIQUE_ID].push(upload.document)
              c = c + documents[p.UNIQUE_ID].length;
            }
          }
        });
        setDocuments(documents);
        setDocumentCount(c);
      })
    }
  }, [props.sessionUploads])


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
        position: "relative"
        // marginTop: "-0.5rem"
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
              minHeight: calcItemHeight(itemDocuments),
              transform: `translateY(${virtualRow.start}px)`
            }}
          >
            {isLoaderRow ? hasNextPage ? <Loading type='SECONDARY' /> : 'Done' :
              <Item item={item} documents={itemDocuments} graphClient={props.graphClient}
                relationshipListUrl={props.relationshipListUrl} deleteAccess={props.deleteAccess} deleting={null}></Item>}
          </div>
        )
      })}
    </div>
  </div>
};
