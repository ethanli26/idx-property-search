import "./Pagination.css";

//sentinel for a gap in the page run, kept distinct from any real page number
const ELLIPSIS = "ellipsis";

//pages shown either side of the current one
const SIBLING_COUNT = 1;

function pageRange(start, end) {
  const pages = [];
  for (let page = start; page <= end; page += 1) pages.push(page);
  return pages;
}

//Builds the page run for the control: real page numbers plus ELLIPSIS markers.
//Every branch below emits each page number at most once, which is what keeps a
//run like "1 ... 22 23 24 ... 24" from ever forming near the end of the set.
function buildPageItems(currentPage, totalPages, siblingCount = SIBLING_COUNT) {
  //first, last, both gaps, the current page, and its siblings
  const maxSlots = siblingCount * 2 + 5;

  //short sets fit whole, so no gap is needed at all
  if (totalPages <= maxSlots) {
    return pageRange(1, totalPages);
  }

  const firstSibling = Math.max(currentPage - siblingCount, 1);
  const lastSibling = Math.min(currentPage + siblingCount, totalPages);

  //a gap only earns its place when it hides more than the single page it replaces
  const hasLeftGap = firstSibling > 2;
  const hasRightGap = lastSibling < totalPages - 1;

  //the run at whichever end is expanded is a fixed length, so the control
  //keeps a steady width as the user pages through
  const edgeRunLength = siblingCount * 2 + 3;

  if (!hasLeftGap && hasRightGap) {
    return [...pageRange(1, edgeRunLength), ELLIPSIS, totalPages];
  }

  //the run already reaches the final page, so the last page must not be appended again
  if (hasLeftGap && !hasRightGap) {
    return [
      1,
      ELLIPSIS,
      ...pageRange(totalPages - edgeRunLength + 1, totalPages),
    ];
  }

  return [
    1,
    ELLIPSIS,
    ...pageRange(firstSibling, lastSibling),
    ELLIPSIS,
    totalPages,
  ];
}

function Pagination({ currentPage, totalPages, onPageChange }) {
  //a single page of results needs no control
  if (totalPages <= 1) return null;

  const items = buildPageItems(currentPage, totalPages);
  const onFirstPage = currentPage === 1;
  const onLastPage = currentPage === totalPages;

  //one guarded entry point, so no control can request a page that does not exist
  function goToPage(page) {
    if (page < 1 || page > totalPages || page === currentPage) return;
    onPageChange(page);
  }

  return (
    <nav className="pagination" aria-label="Pagination">
      <button
        type="button"
        className="pagination__step"
        onClick={() => goToPage(currentPage - 1)}
        disabled={onFirstPage}
      >
        Previous
      </button>

      <ul className="pagination__pages">
        {items.map((item, index) =>
          item === ELLIPSIS ? (
            <li
              //two gaps can coexist, so the side is what makes the key unique
              key={`gap-${index}`}
              className="pagination__gap"
              aria-hidden="true"
            >
              {"…"}
            </li>
          ) : (
            <li key={item}>
              <button
                type="button"
                className={
                  item === currentPage
                    ? "pagination__page pagination__page--current"
                    : "pagination__page"
                }
                aria-label={`Page ${item}`}
                aria-current={item === currentPage ? "page" : undefined}
                onClick={() => goToPage(item)}
              >
                {item}
              </button>
            </li>
          )
        )}
      </ul>

      <button
        type="button"
        className="pagination__step"
        onClick={() => goToPage(currentPage + 1)}
        disabled={onLastPage}
      >
        Next
      </button>
    </nav>
  );
}

export default Pagination;
