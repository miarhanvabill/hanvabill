sed -i '' -e '/{hasMore && customers.length > 0 && (/,/)}/c\
      {totalCustomers > 0 && (\
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between border-t pt-4 text-sm text-muted-foreground">\
          <div className="mb-4 sm:mb-0 text-center sm:text-left">\
            Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, totalCustomers)} of {totalCustomers} customers\
          </div>\
          <div className="flex flex-wrap items-center justify-center gap-4">\
            <div className="flex items-center gap-2">\
              <select\
                className="border rounded px-2 py-1 bg-background text-foreground"\
                value={pageSize}\
                onChange={(e) => {\
                  setPageSize(Number(e.target.value))\
                  setCurrentPage(1)\
                }}\
              >\
                <option value={10}>10</option>\
                <option value={20}>20</option>\
                <option value={50}>50</option>\
                <option value={100}>100</option>\
              </select>\
              <span>per page</span>\
            </div>\
            <div className="flex items-center gap-1">\
              <Button\
                variant="outline"\
                size="sm"\
                onClick={() => handlePageChange(currentPage - 1)}\
                disabled={currentPage === 1 || loading}\
              >\
                {"<"}\
              </Button>\
              <div className="flex items-center gap-1 mx-2 overflow-x-auto max-w-[200px] sm:max-w-none">\
                {Array.from({ length: Math.ceil(totalCustomers / pageSize) }, (_, i) => i + 1)\
                  .filter(p => p === 1 || p === Math.ceil(totalCustomers / pageSize) || Math.abs(p - currentPage) <= 1)\
                  .map((p, i, arr) => (\
                    <React.Fragment key={p}>\
                      {i > 0 && arr[i - 1] !== p - 1 && <span className="px-2">...</span>}\
                      <Button\
                        variant={p === currentPage ? "default" : "outline"}\
                        size="sm"\
                        className={p === currentPage ? "bg-slate-900 text-white hover:bg-slate-800" : ""}\
                        onClick={() => handlePageChange(p)}\
                        disabled={loading}\
                      >\
                        {p}\
                      </Button>\
                    </React.Fragment>\
                  ))}\
              </div>\
              <Button\
                variant="outline"\
                size="sm"\
                onClick={() => handlePageChange(currentPage + 1)}\
                disabled={currentPage >= Math.ceil(totalCustomers / pageSize) || loading}\
              >\
                {">"}\
              </Button>\
            </div>\
          </div>\
        </div>\
      )}' app/customers/page.tsx
