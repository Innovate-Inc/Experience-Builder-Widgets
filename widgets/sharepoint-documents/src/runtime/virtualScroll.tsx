/** @jsx jsx */
import {AllWidgetProps, jsx, React} from "jimu-core";
import {useInfiniteQuery} from 'react-query';
import {useVirtual} from 'react-virtual';
import {ListItem} from './listItem';
import {useState} from 'react';
import {Loading, Tooltip} from 'jimu-ui';

async function queryRelationshipList(graphClient, relationshipListUrl, globalid) {
  return graphClient.api(`${relationshipListUrl}/items?$filter=fields/RecordFK+eq+'${globalid}'`)
    .get().then(r => r.value);
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
  return `${40 + (documents?.length > 0 ? documents?.length * 20 : 20)}px`;
}

// function wrapFileName(filename) {
//   if (filename.length > 20 ) {
//     return [filename.map(i => <a href={i.webUrl} target="_blank">
//       <ListItem title={i.fields.LinkFilename}/></a>)]
//   } else if (filename.length > 0 && filename.length < 20){
//     return [filename.map(i => <a href={i.webUrl} target="_blank"><ListItem title={i.fields.LinkFilename}/></a>)]
//   } else {
//     return "No documents found for this site."
//   }
// }

function Item(props) {
  return <div style={{height: calcItemHeight(props.documents)}}>
    <h5 style={{marginBottom: 0}}>{props.item.LABEL}</h5>
    {props.documents.length > 0
        ? [...props.documents.map(i =>
            <Tooltip onClose={function noRefCheck(){}} onOpen={function noRefCheck(){}} title={i.fields.LinkFilename}>
              <a href={i.webUrl} target="_blank">
                <ListItem title={i.fields.LinkFilename}/>
              </a>
            </Tooltip>)]
      : 'No documents found for this site.'}
    <hr></hr>
  </div>
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
    console.log('rebuilding virtual scroll')
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
      }}
    >
      {rowVirtualizer.virtualItems.map((virtualRow) => {
        const isLoaderRow = virtualRow.index > pageData.length - 1;
        const item = pageData[virtualRow.index];

        return (
          <div
            key={virtualRow.index}
            ref={el => virtualRow.measureRef(el)}
            className={
              virtualRow.index % 2 ? "ListItemOdd" : "ListItemEven"
            }
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 300,
              // height: calcItemHeight(item),
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            {isLoaderRow ? hasNextPage ? <Loading type='SECONDARY'/> : 'Done' :
                <Item id="tooltip" item={item} documents={documents[item.UNIQUE_ID]}></Item>}
          </div>
        )
      })}
    </div>
  </div>
};
