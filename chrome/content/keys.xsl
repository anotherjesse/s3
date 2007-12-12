<?xml version="1.0" encoding="UTF-8"?>

<xsl:stylesheet version="1.0"
  xmlns:S3="http://s3.amazonaws.com/doc/2006-03-01/"
	xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

<xsl:template match="/">
  <html>
	<style>
		body {
			background: #eee;
		}
		table {
			padding: 10px;
			background: #fff;
		  -moz-border-radius: 10px;
		  border: 1px solid #ddd;
		}
	</style>
  <body>
    <table border="0" cellspacing="0" width="100%">
    <tr>
      <th align="left">Key</th>
      <th align="left">Size</th>
      <th align="left">LastModified</th>
    </tr>
    <xsl:for-each select="S3:ListBucketResult/S3:Contents">
    <tr>
      <td><a><xsl:attribute name="href"><xsl:value-of select="S3:Key"/></xsl:attribute><xsl:value-of select="S3:Key"/></a></td>
      <td><xsl:value-of select="S3:LastModified"/></td>
      <td><xsl:value-of select="S3:Size"/></td>
    </tr>
    </xsl:for-each>
    </table>
  </body>
  </html>
</xsl:template>

</xsl:stylesheet>

